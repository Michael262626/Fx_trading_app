# NestJS Auth Service with OTP Verification

This service handles user registration with OTP-based email verification using **NestJS**, **TypeORM**, and **PostgreSQL**. It includes the ability to:

- Register new users
- Hash and store passwords
- Send a One-Time Password (OTP) via email
- Verify OTPs to activate users

---

##  Technologies Used

- **NestJS** – A progressive Node.js framework
- **TypeORM** – ORM for data access
- **PostgreSQL** – Relational database
- **Jest** – Unit testing
- **bcrypt** – Password hashing
- **Node.js crypto** – Random OTP generation

---
## Features

### 1. **User Registration & Email Verification**
- **POST** `/auth/register`: Register a new user with their name, email, and password.
- **POST** `/auth/verify`: Verify OTP sent to the user's email to activate the account.
- OTPs are valid for **5 minutes** and are stored temporarily in-memory using a `Map`.

### 2. **Wallet Management**
- Users will have wallets that support multiple currencies (NGN, USD, EUR, etc.).
- Wallets start with an initial balance in NGN and can be funded in different currencies.
- Users can convert between currencies using real-time FX rates.

### 3. **Currency Conversion & Trading**
- Users can trade between **NGN** and **other currencies** (USD, EUR, GBP, etc.).
- Currency conversion happens using real-time FX rates fetched from an external API.

### 4. **Transaction History**
- Users' actions (funding wallet, conversion, trading) are logged.
- Transaction history includes details like amount, rate, type, timestamp, and status.

### 5. **Caching Fx rates**
- Implement caching for FX rates using Redis or a similar in-memory store. Cache the rates for a short   period   to reduce the frequency of external API calls. This reduces the load on both the FX API and our system while ensuring relatively up-to-date rates.

- Fallback mechanism: In case the external FX API is down or rate limits are exceeded, use previously cached rates or fall back to a secondary source for rate data.

- Rate expiration: Ensure cached FX rates expire after a short time (e.g., 1-2 minutes) to keep the rates up-to-date.
---


- OTP is valid for **5 minutes**
- OTPs are stored **in-memory** using a `Map`
- Only **email** is used for user verification
- Email sending is abstracted via `EmailService`
- Passwords are hashed with **bcrypt**
- `User` entity has an `isVerified` flag
- Verification does not require login/session

---


### 1. **Register a new user**
- **POST** `/auth/register`
- **Body:**
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securePassword"
  }

  # Install dependencies
  npm install

# Create .env and configure DB
cp .env.example .env

# Run DB migrations (if any)
npm run typeorm migration:run

# Start the app
npm run start:dev

