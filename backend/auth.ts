import Database from 'better-sqlite3';
import path from 'path';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import twilio from 'twilio';

const dbPath = path.join(process.cwd(), 'agrismart.db');

let db: Database.Database | null = null;

export function initializeDatabase() {
  try {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    
    // Create users table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        language TEXT DEFAULT 'English',
        country TEXT,
        region TEXT,
        phone_country_code TEXT,
        phone_number TEXT,
        recovery_question TEXT,
        recovery_answer_hash TEXT,
        profile_image_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const userColumns = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
    const hasProfileImageColumn = userColumns.some((column) => column.name === 'profile_image_url');
    if (!hasProfileImageColumn) {
      db.exec('ALTER TABLE users ADD COLUMN profile_image_url TEXT');
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        code_hash TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        used_at INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create farm records table
    db.exec(`
      CREATE TABLE IF NOT EXISTS farm_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        crop_name TEXT NOT NULL,
        variety TEXT,
        field_or_plot_name TEXT,
        field_size REAL,
        field_size_unit TEXT,
        planting_date TEXT,
        expected_harvest_date TEXT,
        actual_harvest_date TEXT,
        planting_method TEXT,
        status TEXT,
        yield REAL,
        yield_unit TEXT,
        input_costs REAL,
        revenue REAL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create diagnoses table
    db.exec(`
      CREATE TABLE IF NOT EXISTS diagnoses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        timestamp INTEGER NOT NULL,
        image_url TEXT,
        data TEXT NOT NULL,
        resolved INTEGER DEFAULT 0,
        resolved_at INTEGER,
        treatment_applied TEXT,
        synced INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create soil tests table
    db.exec(`
      CREATE TABLE IF NOT EXISTS soil_tests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        timestamp INTEGER NOT NULL,
        color TEXT,
        texture TEXT,
        smell TEXT,
        additional TEXT,
        target_crop TEXT,
        soil_type TEXT,
        analysis TEXT,
        suitability TEXT,
        improvement TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create crop rotation plans table
    db.exec(`
      CREATE TABLE IF NOT EXISTS crop_rotation_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        timestamp INTEGER NOT NULL,
        title TEXT,
        field_or_plot_name TEXT,
        soil_type_context TEXT,
        previous_crops_analyzed TEXT,
        pest_risks_addressed TEXT,
        summary TEXT,
        soil_health_score INTEGER,
        pest_break_score INTEGER,
        sequence TEXT,
        long_term_benefits TEXT,
        synced INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

export interface User {
  id: number;
  email: string;
  name: string;
  language: string;
  country?: string;
  region?: string;
  phoneCountryCode?: string;
  phoneNumber?: string;
  recoveryQuestion?: string;
  profileImageUrl?: string;
}

export interface AuthToken {
  userId: number;
  email: string;
  name: string;
}

// Register user
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function registerUser(
  email: string,
  password: string,
  name: string,
  language: string = 'English',
  country?: string,
  region?: string,
  phoneCountryCode?: string,
  phoneNumber?: string,
  recoveryQuestion?: string,
  recoveryAnswer?: string,
  profileImageUrl?: string
): Promise<{ success: boolean; error?: string; user?: User }> {
  try {
    const database = getDatabase();
    const normalizedEmail = normalizeEmail(email);
    
    // Check if user already exists
    const existing = database.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      return { success: false, error: 'Email already registered' };
    }

    // Hash password
    const salt = await bcryptjs.genSalt(10);
    const password_hash = await bcryptjs.hash(password, salt);

    // Insert user
    const normalizedPhoneCountryCode = phoneCountryCode?.trim() || null;
    const normalizedPhoneNumber = phoneNumber?.trim() || null;
    const normalizedRecoveryQuestion = recoveryQuestion?.trim() || null;
    const normalizedRecoveryAnswer = recoveryAnswer?.trim() ? await bcryptjs.hash(recoveryAnswer.trim().toLowerCase(), 10) : null;
    const normalizedProfileImageUrl = profileImageUrl?.trim() || null;

    const stmt = database.prepare(`
      INSERT INTO users (email, name, password_hash, language, country, region, phone_country_code, phone_number, recovery_question, recovery_answer_hash, profile_image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      normalizedEmail,
      name,
      password_hash,
      language,
      country,
      region,
      normalizedPhoneCountryCode,
      normalizedPhoneNumber,
      normalizedRecoveryQuestion,
      normalizedRecoveryAnswer,
      normalizedProfileImageUrl
    ) as any;

    const user: User = {
      id: result.lastInsertRowid as number,
      email: normalizedEmail,
      name,
      language,
      country,
      region,
      phoneCountryCode: normalizedPhoneCountryCode || undefined,
      phoneNumber: normalizedPhoneNumber || undefined,
      recoveryQuestion: normalizedRecoveryQuestion || undefined,
      profileImageUrl: normalizedProfileImageUrl || undefined
    };

    return { success: true, user };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: 'Registration failed' };
  }
}

// Login user
export async function loginUser(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; user?: User; token?: string }> {
  try {
    const database = getDatabase();
    const normalizedEmail = normalizeEmail(email);

    // Find user
    const user = database.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail) as any;
    if (!user) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Check password
    const passwordMatch = await bcryptjs.compare(password, user.password_hash);
    if (!passwordMatch) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '30d' }
    );

    await sendLoginAlertEmail(user.email, user.name);

    const returnUser: User = {
      id: user.id,
      email: user.email,
      name: user.name,
      language: user.language,
      country: user.country,
      region: user.region,
      phoneCountryCode: user.phone_country_code || undefined,
      phoneNumber: user.phone_number || undefined,
      recoveryQuestion: user.recovery_question || undefined,
      profileImageUrl: user.profile_image_url || undefined
    };

    return { success: true, user: returnUser, token };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'Login failed' };
  }
}

// Verify token
export function verifyToken(token: string): AuthToken | null {
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key-change-in-production'
    ) as AuthToken;
    return decoded;
  } catch (error) {
    return null;
  }
}

// Get user by ID
export function getUserById(userId: number): User | null {
  try {
    const database = getDatabase();
    const user = database.prepare('SELECT id, email, name, language, country, region, phone_country_code, phone_number, recovery_question, profile_image_url FROM users WHERE id = ?').get(userId) as any;
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      language: user.language,
      country: user.country,
      region: user.region,
      phoneCountryCode: user.phone_country_code || undefined,
      phoneNumber: user.phone_number || undefined,
      recoveryQuestion: user.recovery_question || undefined,
      profileImageUrl: user.profile_image_url || undefined
    };
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

export function getUserByEmail(email: string): User | null {
  try {
    const database = getDatabase();
    const normalizedEmail = normalizeEmail(email);
    const user = database.prepare('SELECT id, email, name, language, country, region, phone_country_code, phone_number, recovery_question, profile_image_url FROM users WHERE email = ?').get(normalizedEmail) as any;
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      language: user.language,
      country: user.country,
      region: user.region,
      phoneCountryCode: user.phone_country_code || undefined,
      phoneNumber: user.phone_number || undefined,
      recoveryQuestion: user.recovery_question || undefined,
      profileImageUrl: user.profile_image_url || undefined
    };
  } catch (error) {
    console.error('Error fetching user by email:', error);
    return null;
  }
}

function generateResetCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendRecoveryEmail(userEmail: string, userName: string, code: string): Promise<boolean> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || smtpUser;

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.log(`[Auth] Simulated email reset code for ${userEmail}: ${code}`);
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(process.env.SMTP_PORT || 587),
      secure: (Number(process.env.SMTP_PORT || 587) === 465),
      auth: { user: smtpUser, pass: smtpPass }
    });

    await transporter.sendMail({
      from: smtpFrom,
      to: userEmail,
      subject: 'AgriSmart AI password reset code',
      text: `Hello ${userName},\n\nYour AgriSmart AI recovery code is: ${code}\n\nThis code expires in 15 minutes.`,
      html: `<p>Hello ${userName},</p><p>Your AgriSmart AI recovery code is:</p><h2>${code}</h2><p>This code expires in 15 minutes.</p>`
    });
    return true;
  } catch (error) {
    console.error('Email delivery failed:', error);
    return false;
  }
}

async function sendRecoverySms(phoneNumber: string, code: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.log(`[Auth] Simulated SMS reset code for ${phoneNumber}: ${code}`);
    return false;
  }

  try {
    const client = twilio(accountSid, authToken);
    await client.messages.create({
      body: `Your AgriSmart AI recovery code is ${code}. This code expires in 15 minutes.`,
      from: fromNumber,
      to: phoneNumber
    });
    return true;
  } catch (error) {
    console.error('SMS delivery failed:', error);
    return false;
  }
}

async function sendLoginAlertEmail(userEmail: string, userName: string): Promise<boolean> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || smtpUser;

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.log(`[Auth] Simulated login notification email for ${userEmail}: ${userName} logged in successfully.`);
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(process.env.SMTP_PORT || 587),
      secure: (Number(process.env.SMTP_PORT || 587) === 465),
      auth: { user: smtpUser, pass: smtpPass }
    });

    await transporter.sendMail({
      from: smtpFrom,
      to: userEmail,
      subject: 'AgriSmart AI login alert',
      text: `Hello ${userName},\n\nA new login was detected for your AgriSmart account.`,
      html: `<p>Hello ${userName},</p><p>A new login was detected for your AgriSmart account.</p>`
    });
    return true;
  } catch (error) {
    console.error('Login alert email failed:', error);
    return false;
  }
}

async function createResetCodeForUser(userId: number): Promise<string> {
  const database = getDatabase();
  const code = generateResetCode();
  const expiresAt = Date.now() + 15 * 60 * 1000;
  const codeHash = await bcryptjs.hash(code, 10);

  database.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(userId);
  database.prepare('INSERT INTO password_reset_tokens (user_id, code_hash, expires_at) VALUES (?, ?, ?)').run(userId, codeHash, expiresAt);
  return code;
}

export async function requestPasswordReset(payload: {
  email: string;
  recoveryMethod?: 'email' | 'phone' | 'question';
  countryCode?: string;
  phoneNumber?: string;
  securityAnswer?: string;
}): Promise<{ success: boolean; error?: string; message?: string; code?: string }> {
  const user = getUserByEmail(payload.email || '');

  if (!user) {
    return {
      success: true,
      message: 'If an account exists for this email, a recovery code will be sent.'
    };
  }

  const method = payload.recoveryMethod || 'email';

  if (method === 'phone') {
    const normalizedCountryCode = (payload.countryCode || '').trim();
    const normalizedPhoneNumber = (payload.phoneNumber || '').replace(/\D/g, '');

    if (!normalizedCountryCode || !normalizedPhoneNumber) {
      return { success: false, error: 'Phone country code and number are required.' };
    }

    const userPhoneCountry = user.phoneCountryCode || '';
    const userPhoneNumber = (user.phoneNumber || '').replace(/\D/g, '');

    if (userPhoneCountry !== normalizedCountryCode || userPhoneNumber !== normalizedPhoneNumber) {
      return { success: true, message: 'If this phone matches your account, a recovery code will be sent.' };
    }
  }

  if (method === 'question') {
    if (!payload.securityAnswer) {
      return { success: false, error: 'Security answer is required.' };
    }

    if (!user.recoveryQuestion) {
      return { success: true, message: 'No security question is set for this account.' };
    }

    const savedAnswer = databasePrepareRecoveryAnswer(user.id);
    const matches = savedAnswer && await bcryptjs.compare(payload.securityAnswer.trim().toLowerCase(), savedAnswer);
    if (!matches) {
      return { success: false, error: 'Incorrect security answer.' };
    }
  }

  const code = await createResetCodeForUser(user.id);

  if (method === 'phone') {
    const fullPhone = `${payload.countryCode || user.phoneCountryCode || ''}${payload.phoneNumber || user.phoneNumber || ''}`;
    const smsSent = await sendRecoverySms(fullPhone, code);
    return {
      success: true,
      message: smsSent
        ? `A recovery code was sent to ${fullPhone}.`
        : `A recovery code was generated for ${fullPhone}. Check the server logs or configure Twilio to deliver SMS automatically.`,
      code
    };
  }

  if (method === 'question') {
    const emailSent = await sendRecoveryEmail(user.email, user.name, code);
    return {
      success: true,
      message: emailSent
        ? 'Your security question was verified and a recovery code was sent to your email.'
        : 'Your security question was verified. A recovery code was generated for your account; configure SMTP to send it by email automatically.',
      code
    };
  }

  const emailSent = await sendRecoveryEmail(user.email, user.name, code);
  return {
    success: true,
    message: emailSent
      ? 'A recovery code has been sent to your registered email address.'
      : 'A recovery code was generated for your account. Configure SMTP to send it automatically by email.',
    code
  };
}

function databasePrepareRecoveryAnswer(userId: number): string | null {
  const database = getDatabase();
  const result = database.prepare('SELECT recovery_answer_hash FROM users WHERE id = ?').get(userId) as { recovery_answer_hash?: string } | undefined;
  return result?.recovery_answer_hash || null;
}

export async function resetPasswordWithCode(payload: {
  email: string;
  code: string;
  newPassword: string;
}): Promise<{ success: boolean; error?: string; message?: string }> {
  const user = getUserByEmail(payload.email || '');
  if (!user) {
    return { success: false, error: 'No account found for this email.' };
  }

  const database = getDatabase();
  const tokenRow = database.prepare('SELECT id, code_hash, expires_at, used_at FROM password_reset_tokens WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(user.id) as any;

  if (!tokenRow) {
    return { success: false, error: 'No valid recovery code was found.' };
  }

  if (tokenRow.used_at) {
    return { success: false, error: 'This recovery code has already been used.' };
  }

  if (Date.now() > tokenRow.expires_at) {
    return { success: false, error: 'This recovery code has expired.' };
  }

  const isValidCode = await bcryptjs.compare(payload.code.trim(), tokenRow.code_hash);
  if (!isValidCode) {
    return { success: false, error: 'The recovery code is incorrect.' };
  }

  if (!payload.newPassword || payload.newPassword.length < 8) {
    return { success: false, error: 'New password must be at least 8 characters long.' };
  }

  const salt = await bcryptjs.genSalt(10);
  const passwordHash = await bcryptjs.hash(payload.newPassword, salt);

  database.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(passwordHash, user.id);
  database.prepare('UPDATE password_reset_tokens SET used_at = ? WHERE id = ?').run(Date.now(), tokenRow.id);

  return {
    success: true,
    message: 'Your password has been reset successfully.'
  };
}

// Update user profile
export function updateUserProfile(
  userId: number,
  data: { name?: string; language?: string; country?: string; region?: string; profileImageUrl?: string }
): boolean {
  try {
    const database = getDatabase();
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.language) {
      updates.push('language = ?');
      values.push(data.language);
    }
    if (data.country) {
      updates.push('country = ?');
      values.push(data.country);
    }
    if (data.region) {
      updates.push('region = ?');
      values.push(data.region);
    }
    if (data.profileImageUrl !== undefined) {
      updates.push('profile_image_url = ?');
      values.push(data.profileImageUrl || null);
    }

    if (updates.length === 0) return true;

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(userId);

    const stmt = database.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    return true;
  } catch (error) {
    console.error('Error updating user:', error);
    return false;
  }
}
