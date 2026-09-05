import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCheck, Download, FileText, Image as ImageIcon, MoreVertical, Paperclip, Reply, Search, Send, Smile, Sprout, Trash2, Video, X } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { cn } from '../lib/utils';

interface ChatAttachment {
  name: string;
  type: string;
  dataUrl: string;
}

interface ChatMessage {
  id: string;
  conversationId: number;
  userId: number;
  author: string;
  authorProfileImageUrl?: string;
  authorRegion?: string;
  content: string;
  attachment?: ChatAttachment;
  isDeleted?: boolean;
  replyToId?: string;
  reactions: Record<string, number>;
  readBy: Array<{ id: number; name: string; profileImageUrl?: string; readAt: number }>;
  createdAt: number;
}

interface ChatMember {
  id: number;
  name: string;
  region?: string;
  profileImageUrl?: string;
  online?: boolean;
}

const reactionOptions = ['👍', '❤️', '😂', '👏'];
  const topicOptions = ['Crop health', 'Market watch', 'Rain & irrigation', 'Pest alert'];

export function CommunityChat() {
  const { token, user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFilePreview, setSelectedFilePreview] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [error, setError] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachmentAccept, setAttachmentAccept] = useState('');
  const [members, setMembers] = useState<ChatMember[]>([]);
  const [chatSearch, setChatSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [privateContact, setPrivateContact] = useState<ChatMember | null>(null);
  const [conversationId, setConversationId] = useState(0);
  const [activityNotice, setActivityNotice] = useState('');
  const [typingUsers, setTypingUsers] = useState<Record<number, string>>({});
  const [readDetailsFor, setReadDetailsFor] = useState<ChatMessage | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) return;
    let source: EventSource | null = null;
    let cancelled = false;
    const historyUrl = conversationId > 0 ? `/api/community-chat/private/${privateContact?.id || ''}` : '/api/community-chat';
    if (conversationId > 0 && !privateContact) return;
    fetch(historyUrl, { headers: { Authorization: `Bearer ${token}` } })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Unable to load chat')))
      .then(data => { if (!cancelled) setMessages(conversationId > 0 ? data.messages : data); })
      .catch(() => { if (!cancelled) setError('Chat history could not be loaded.'); });
    fetch('/api/community-chat/members', { headers: { Authorization: `Bearer ${token}` } })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Unable to load members')))
      .then(data => { if (!cancelled) setMembers(data); })
      .catch(() => undefined);

    source = new EventSource(`/api/community-chat/stream?token=${encodeURIComponent(token)}`);
    source.addEventListener('ready', () => setIsOnline(true));
    source.addEventListener('message', event => {
      const message = JSON.parse(event.data) as ChatMessage;
      if (message.conversationId !== conversationId) return;
      setMessages(current => {
        const target = message.replyToId ? current.find(item => item.id === message.replyToId) : undefined;
        if (target?.userId === user?.id && message.userId !== user?.id) {
          setActivityNotice(`${message.author} replied to your message`);
          window.setTimeout(() => setActivityNotice(''), 4500);
        }
        return current.some(item => item.id === message.id) ? current : [...current, message];
      });
    });
    source.addEventListener('reaction', event => {
      const update = JSON.parse(event.data) as { messageId: string; reactions: Record<string, number>; actorId: number; actorName: string; emoji: string };
      setMessages(current => {
        const target = current.find(message => message.id === update.messageId);
        if (target?.userId === user?.id && update.actorId !== user?.id) {
          setActivityNotice(`${update.actorName} reacted ${update.emoji} to your message`);
          window.setTimeout(() => setActivityNotice(''), 4500);
        }
        return current.map(message => message.id === update.messageId ? { ...message, reactions: update.reactions } : message);
      });
    });
    source.addEventListener('delete', event => {
      const update = JSON.parse(event.data) as { messageId: string };
      setMessages(current => current.map(message => message.id === update.messageId ? { ...message, isDeleted: true, content: '', attachment: undefined } : message));
    });
    source.addEventListener('typing', event => {
      const update = JSON.parse(event.data) as { conversationId: number; userId: number; name: string; isTyping: boolean };
      if (update.conversationId !== conversationId || update.userId === user?.id) return;
      setTypingUsers(current => {
        const next = { ...current };
        if (update.isTyping) next[update.userId] = update.name;
        else delete next[update.userId];
        return next;
      });
    });
    source.addEventListener('presence', event => {
      const update = JSON.parse(event.data) as { userId: number; online: boolean };
      setMembers(current => current.map(member => member.id === update.userId ? { ...member, online: update.online } : member));
      if (privateContact?.id === update.userId) {
        setPrivateContact(current => current ? { ...current, online: update.online } : current);
      }
    });
    source.addEventListener('read', event => {
      const update = JSON.parse(event.data) as { messageId: string; reader: ChatMessage['readBy'][number] };
      setMessages(current => current.map(message => message.id === update.messageId && !message.readBy.some(reader => reader.id === update.reader.id) ? { ...message, readBy: [...message.readBy, update.reader] } : message));
    });
    source.onerror = () => setIsOnline(false);
    return () => { cancelled = true; source?.close(); };
  }, [token, conversationId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  useEffect(() => {
    if (!selectedFile || (!selectedFile.type.startsWith('image/') && !selectedFile.type.startsWith('video/'))) {
      setSelectedFilePreview('');
      return;
    }
    const previewUrl = URL.createObjectURL(selectedFile);
    setSelectedFilePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [selectedFile]);

  const sendMessage = async () => {
    if ((!draft.trim() && !selectedFile) || !token || isSending) return;
    setIsSending(true);
    setError('');
    try {
      let attachment: ChatAttachment | undefined;
      if (selectedFile) {
        if (selectedFile.size > 6 * 1024 * 1024) throw new Error('Files must be smaller than 6 MB.');
        attachment = { name: selectedFile.name, type: selectedFile.type || 'application/octet-stream', dataUrl: await readFile(selectedFile) };
      }
      const response = await fetch('/api/community-chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ token, content: draft.trim(), attachment, replyToId: replyTo?.id, conversationId })
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Message could not be sent.');
      const message = await response.json() as ChatMessage;
      setMessages(current => current.some(item => item.id === message.id) ? current : [...current, message]);
      setDraft('');
      setSelectedFile(null);
      setReplyTo(null);
      sendTyping(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Message could not be sent.');
    } finally { setIsSending(false); }
  };

  const typingTimeoutRef = useRef<number | undefined>(undefined);
  const sendTyping = (isTyping: boolean) => {
    if (!token) return;
    fetch('/api/community-chat/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ token, conversationId, isTyping })
    }).catch(() => undefined);
  };

  const handleDraftChange = (value: string) => {
    setDraft(value);
    if (!value.trim()) {
      sendTyping(false);
      return;
    }
    sendTyping(true);
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => sendTyping(false), 1800);
  };

  const markAsRead = (message: ChatMessage) => {
    if (!token || message.userId === user?.id || message.isDeleted) return;
    fetch(`/api/community-chat/messages/${message.id}/read`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ token })
    }).catch(() => undefined);
  };

  const reactToMessage = async (messageId: string, emoji: string) => {
    if (!token) return;
    await fetch(`/api/community-chat/messages/${messageId}/reactions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ token, emoji })
    });
  };

  const deleteMessage = async (messageId: string) => {
    if (!token || !window.confirm('Delete this message?')) return;
    const response = await fetch(`/api/community-chat/messages/${messageId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ token })
    });
    if (response.ok) setMessages(current => current.map(message => message.id === messageId ? { ...message, isDeleted: true, content: '', attachment: undefined } : message));
  };

  const openAttachmentPicker = (accept: string) => {
    setAttachmentAccept(accept);
    setShowAttachMenu(false);
    fileRef.current?.click();
  };

  const addEmoji = (emoji: string) => {
    setDraft(current => `${current}${emoji}`);
    setShowEmojiPicker(false);
  };

  const openPrivateChat = async (member: ChatMember) => {
    if (!token || member.id === user?.id) return;
    setError('');
    try {
      const response = await fetch(`/api/community-chat/private/${member.id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error('Private chat could not be opened.');
      const data = await response.json();
      setPrivateContact(data.contact);
      setConversationId(data.conversationId);
      setMessages(data.messages);
      setReplyTo(null);
      setShowMembers(false);
      setChatSearch('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Private chat could not be opened.');
    }
  };

  const closePrivateChat = () => {
    setPrivateContact(null);
    setConversationId(0);
    setReplyTo(null);
    setChatSearch('');
    setTypingUsers({});
  };

  const visibleMessages = messages.filter(message => {
    const query = chatSearch.trim().toLowerCase();
    return !query || message.author.toLowerCase().includes(query) || message.content.toLowerCase().includes(query) || message.attachment?.name.toLowerCase().includes(query);
  });

  return (
    <section className="bg-[#f7fbff] rounded-[28px] border border-[#c5d8ec] shadow-[0_18px_50px_rgba(8,35,72,0.18)] overflow-hidden">
      <div className="px-4 sm:px-6 py-4 bg-[#092a55] text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          {privateContact ? <button onClick={closePrivateChat} title="Back to group" className="h-11 w-11 rounded-2xl bg-white text-[#092a55] flex items-center justify-center shadow-inner hover:bg-[#e8f1fb]"><ArrowLeft size={21} /></button> : <div className="h-11 w-11 rounded-2xl bg-white text-[#092a55] flex items-center justify-center font-bold text-xs shadow-inner"><Sprout size={21} /></div>}
          <div><p className="text-[10px] uppercase tracking-[0.18em] text-[#c9e3ff] font-bold">{privateContact ? 'Private conversation' : 'Field circle'}</p><h3 className="font-serif font-bold text-base">{privateContact?.name || 'AgriSmart Farmers Group'}</h3><p className="text-[11px] text-white/75">{privateContact ? (privateContact.online ? 'online now' : 'offline') : `${members.length} members ${isOnline ? '• live agronomy room' : '• connecting...'}`}</p></div>
        </div>
        <div className="flex items-center gap-3"><span className="hidden sm:inline rounded-full border border-white/25 px-2 py-1 text-[9px] font-bold tracking-wider text-white/85">{privateContact ? 'PRIVATE' : 'JOINED'}</span><button onClick={() => { setShowSearch(value => !value); setShowMembers(false); }} title="Search messages" className="p-2 rounded-xl hover:bg-white/10"><Search size={17} className="text-white/90" /></button>{!privateContact && <button onClick={() => { setShowMembers(value => !value); setShowSearch(false); }} title="Community members" className="p-2 rounded-xl hover:bg-white/10"><MoreVertical size={19} className="text-white/90" /></button>}<span className={cn('h-2 w-2 rounded-full', isOnline ? 'bg-[#bfe3ff]' : 'bg-amber-300')} title={isOnline ? 'Connected' : 'Connecting'} /></div>
      </div>

      {activityNotice && <div className="bg-[#fff3c4] px-4 py-2 text-[11px] font-semibold text-[#5f4b16] border-b border-[#eadb99]">{activityNotice}</div>}

      {showSearch && <div className="bg-[#e8f1fb] px-3 py-2"><input autoFocus value={chatSearch} onChange={event => setChatSearch(event.target.value)} placeholder="Search messages" className="w-full px-3 py-2 bg-white rounded-xl border border-[#c5d8ec] text-xs outline-none focus:ring-1 focus:ring-[#1b5ea7]" /></div>}
      {showMembers && <div className="bg-white border-b border-stone-200 px-4 py-3 max-h-44 overflow-y-auto"><p className="text-[10px] uppercase tracking-wider font-bold text-[#667781] mb-2">Community members ({members.length})</p>{members.map(member => <button type="button" key={member.id} disabled={member.id === user?.id} onClick={() => openPrivateChat(member)} className="w-full flex items-center gap-2 py-1.5 px-2 -mx-2 rounded-xl text-left transition-colors hover:bg-[#e8f1fb] disabled:cursor-default disabled:hover:bg-transparent"><span className="relative shrink-0">{member.profileImageUrl ? <img src={member.profileImageUrl} alt={`${member.name} profile`} className="h-9 w-9 rounded-full object-cover border border-[#c5d8ec]" /> : <span className="h-9 w-9 rounded-full bg-[#dcecfb] text-[#123f70] flex items-center justify-center text-[10px] font-bold">{member.name.slice(0, 1).toUpperCase()}</span>}<span className={cn('absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2 border-white', member.online ? 'bg-emerald-500' : 'bg-slate-300')} /></span><div><p className="text-xs font-semibold text-natural-primary">{member.name}{member.id === user?.id ? ' (you)' : ''}</p><p className={cn('text-[10px]', member.online ? 'text-emerald-600' : 'text-natural-text/55')}>{member.id === user?.id ? 'Your account' : member.online ? 'Online now' : member.region || 'Offline'}</p></div></button>)}</div>}

      <div className="px-4 sm:px-6 py-3 bg-[#e8f1fb] border-b border-[#d0e0f1] flex items-center gap-2 overflow-x-auto no-scrollbar"><span className="text-[10px] uppercase tracking-wider text-[#315b84] font-bold whitespace-nowrap">Talk about</span>{topicOptions.map(topic => <button key={topic} onClick={() => setDraft(current => current || `${topic}: `)} className="px-2.5 py-1.5 bg-white border border-[#c5d8ec] rounded-lg text-[10px] font-bold text-[#123f70] whitespace-nowrap hover:border-[#1b5ea7] transition-colors">{topic}</button>)}</div>

      <div className="h-[420px] overflow-y-auto bg-[#f4f9fd] px-3 sm:px-6 py-5 space-y-3">
        {visibleMessages.length === 0 && <div className="h-full flex items-center justify-center text-center text-xs text-natural-text/55">{chatSearch ? 'No matching messages.' : 'Start a conversation with farmers in your community.'}</div>}
        {visibleMessages.map(message => {
          const mine = message.userId === user?.id;
          const quoted = message.replyToId ? messages.find(item => item.id === message.replyToId) : undefined;
          return <div key={message.id} className={cn('flex group', mine ? 'justify-end' : 'justify-start')}>
            <div onMouseEnter={() => markAsRead(message)} onContextMenu={event => { event.preventDefault(); markAsRead(message); setReadDetailsFor(message); }} className={cn('max-w-[88%] sm:max-w-[70%] rounded-2xl px-4 py-3 shadow-sm border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md', message.isDeleted ? 'bg-[#edf0f2] text-[#687783] border-dashed border-[#b9c5ce] rounded-br-md' : mine ? 'bg-[#123f70] text-white border-[#123f70] rounded-br-md' : 'bg-white text-[#183447] border-[#d0e0f1] rounded-bl-md')}>
              <div className="flex items-center gap-2 mb-2">
                {message.authorProfileImageUrl ? <img src={message.authorProfileImageUrl} alt={`${message.author} profile`} className="h-7 w-7 rounded-full object-cover border border-white/60" /> : <div className={cn('h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold', mine ? 'bg-white/20 text-white' : 'bg-[#dcecfb] text-[#123f70]')}>{message.author.slice(0, 1).toUpperCase()}</div>}
                <div className="min-w-0"><p className={cn('text-[10px] font-bold truncate', mine ? 'text-white' : 'text-[#123f70]')}>{message.author}</p>{message.authorRegion && <p className={cn('text-[9px] truncate', mine ? 'text-white/60' : 'text-[#68849c]')}>{message.authorRegion}</p>}</div>
              </div>
              {quoted && <div className="border-l-2 border-natural-gold bg-black/5 px-2 py-1 mb-1.5 rounded-r-lg text-[10px] text-natural-text/60 truncate">Replying to {quoted.author}: {quoted.content || quoted.attachment?.name}</div>}
              {message.isDeleted ? <p className="text-xs italic text-natural-text/65">This message was deleted</p> : <>
                {message.attachment && <AttachmentPreview attachment={message.attachment} />}
                {message.content && <p className={cn('text-xs whitespace-pre-wrap break-words', mine ? 'text-white' : 'text-natural-text')}>{message.content}</p>}
              </>}
              <div className={cn('flex items-center justify-end gap-2 mt-2', mine ? 'text-white/60' : 'text-natural-text/45')}>
                <span className="text-[9px]">{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {mine && !message.isDeleted && <CheckCheck size={14} className="text-[#c9e3ff]" aria-label="Delivered and read" />}
                {!message.isDeleted && <button onClick={() => setReplyTo(message)} title="Reply" className="opacity-0 group-hover:opacity-100 text-natural-accent hover:text-natural-primary"><Reply size={12} /></button>}
                {mine && !message.isDeleted && <button onClick={() => deleteMessage(message.id)} title="Delete message" className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700"><Trash2 size={12} /></button>}
              </div>
              {!message.isDeleted && <div className="flex gap-1 mt-1 flex-wrap">
                {Object.entries(message.reactions).filter(([, count]) => count > 0).map(([emoji, count]) => <button key={emoji} onClick={() => reactToMessage(message.id, emoji)} className="text-[11px] bg-white/70 rounded-full px-1.5 py-0.5 transition-transform hover:scale-105">{emoji} {count}</button>)}
                <div className="hidden group-hover:flex gap-0.5 bg-white rounded-full px-1 shadow-sm">{reactionOptions.map(emoji => <button key={emoji} onClick={() => reactToMessage(message.id, emoji)} className="text-xs p-0.5 transition-transform hover:scale-125" title={`React ${emoji}`}>{emoji}</button>)}</div>
              </div>}
            </div>
            {readDetailsFor?.id === message.id && <div className="absolute z-30 mt-2 w-64 rounded-2xl border border-[#c5d8ec] bg-white p-3 shadow-xl"><div className="flex items-center justify-between mb-2"><p className="text-xs font-bold text-[#123f70]">Read by</p><button onClick={() => setReadDetailsFor(null)} className="text-[#667781] hover:text-[#123f70]"><X size={14} /></button></div>{message.readBy.length === 0 ? <p className="text-[11px] text-[#667781]">No one has opened this yet.</p> : <div className="space-y-2">{message.readBy.map(reader => <div key={reader.id} className="flex items-center gap-2">{reader.profileImageUrl ? <img src={reader.profileImageUrl} alt={`${reader.name} profile`} className="h-7 w-7 rounded-full object-cover" /> : <div className="h-7 w-7 rounded-full bg-[#dcecfb] text-[#123f70] flex items-center justify-center text-[10px] font-bold">{reader.name.slice(0, 1).toUpperCase()}</div>}<span className="text-xs text-[#183447]">{reader.name}</span></div>)}</div>}</div>}
          </div>;
        })}
        <div ref={endRef} />
      </div>

      {Object.values(typingUsers).length > 0 && <div className="px-5 py-2 bg-[#e8f1fb] text-[11px] font-semibold italic text-[#315b84]">{Object.values(typingUsers).join(', ')} {Object.values(typingUsers).length === 1 ? 'is' : 'are'} typing...</div>}

      <div className="relative p-3 sm:p-4 bg-white border-t border-[#d7e9f8]">
        {replyTo && <div className="flex items-center justify-between bg-natural-tan/50 rounded-xl px-3 py-2 mb-2 text-[11px] text-natural-text"><span className="truncate">Replying to <b>{replyTo.author}</b>: {replyTo.content || replyTo.attachment?.name}</span><button onClick={() => setReplyTo(null)}><X size={14} /></button></div>}
        {selectedFile && <div className="flex items-center gap-2 bg-natural-tan/50 rounded-xl px-3 py-2 mb-2 text-[11px]">
          {selectedFilePreview && selectedFile.type.startsWith('image/') ? <img src={selectedFilePreview} alt="Selected upload" className="h-12 w-12 rounded-lg object-cover" /> : selectedFilePreview && selectedFile.type.startsWith('video/') ? <video src={selectedFilePreview} className="h-12 w-12 rounded-lg object-cover" muted /> : <FileText size={14} />}
          <span className="truncate flex-1">{selectedFile.name}</span><button onClick={() => setSelectedFile(null)}><X size={14} /></button>
        </div>}
        {error && <p className="text-[11px] text-red-600 mb-2">{error}</p>}
        {showAttachMenu && <div className="absolute z-10 mt-[-165px] ml-1 bg-white rounded-2xl shadow-xl border border-stone-200 p-2 space-y-1">
          <button onClick={() => openAttachmentPicker('image/*')} className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs hover:bg-stone-100"><ImageIcon size={15} className="text-purple-500" /> Photos</button>
          <button onClick={() => openAttachmentPicker('video/*')} className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs hover:bg-stone-100"><Video size={15} className="text-red-500" /> Videos</button>
          <button onClick={() => openAttachmentPicker('')} className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs hover:bg-stone-100"><FileText size={15} className="text-blue-500" /> Documents</button>
        </div>}
        {showEmojiPicker && <div className="absolute bottom-16 left-3 z-20 bg-white rounded-2xl shadow-xl border border-stone-200 p-2 grid grid-cols-6 gap-1 text-lg">{['😀', '😂', '😊', '👍', '❤️', '🙏', '🌱', '🌾', '🚜', '🎉', '👏', '🤝'].map(emoji => <button type="button" key={emoji} onClick={() => addEmoji(emoji)} className="p-1 hover:bg-stone-100 rounded-lg" aria-label={`Insert ${emoji}`}>{emoji}</button>)}</div>}
        <div className="flex items-end gap-2 relative">
          <input ref={fileRef} type="file" accept={attachmentAccept} className="hidden" onChange={event => { setSelectedFile(event.target.files?.[0] || null); event.currentTarget.value = ''; }} />
          <button onClick={() => setShowEmojiPicker(value => !value)} title="Emoji" className="p-2.5 text-natural-accent hover:text-natural-primary hover:bg-natural-tan rounded-xl"><Smile size={20} /></button>
          <button onClick={() => setShowAttachMenu(value => !value)} title="Attach" className="p-2.5 text-natural-accent hover:text-natural-primary hover:bg-natural-tan rounded-xl"><Paperclip size={19} /></button>
          <textarea value={draft} onChange={event => handleDraftChange(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(); } }} rows={1} placeholder="Share an observation, question, or update..." className="flex-1 resize-none px-3 py-2.5 bg-[#f4f8fc] rounded-xl border border-[#c5d8ec] text-xs focus:outline-none focus:ring-1 focus:ring-[#1b5ea7]" />
          <button onClick={sendMessage} disabled={isSending || (!draft.trim() && !selectedFile)} title="Send message" className="p-2.5 bg-[#092a55] text-white rounded-xl disabled:opacity-40 shadow-sm"><Send size={17} /></button>
        </div>
        <p className="text-[10px] text-natural-text/45 mt-2">Images, videos, and any file type up to 6 MB</p>
      </div>
    </section>
  );
}

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('File could not be read.')); reader.readAsDataURL(file); });
}

function AttachmentPreview({ attachment }: { attachment: ChatAttachment }) {
  const mediaType = attachment.type || '';
  const extension = attachment.name.split('.').pop()?.toLowerCase() || '';
  const isImage = mediaType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic'].includes(extension);
  const isVideo = mediaType.startsWith('video/') || ['mp4', 'webm', 'mov', 'm4v', 'avi'].includes(extension);
  if (isImage) return <a href={attachment.dataUrl} target="_blank" rel="noreferrer"><img src={attachment.dataUrl} alt={attachment.name} className="max-h-64 w-full rounded-xl object-contain mb-1.5 bg-black/5" /></a>;
  if (isVideo) return <video controls preload="metadata" src={attachment.dataUrl} className="max-h-64 max-w-full rounded-xl mb-1.5" />;
  return <a href={attachment.dataUrl} download={attachment.name} className="flex items-center gap-2 bg-black/5 rounded-xl p-2 mb-1.5 text-xs text-natural-primary font-semibold"><Download size={14} /><span className="truncate">{attachment.name}</span></a>;
}
