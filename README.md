# Bushava-Azbuka-Tim2

## Database Setup

This project uses SQLite for data storage.

### Prerequisites

- Node.js installed

### Installation

Install the required dependencies from `package.json`:

```bash
npm install
```

### Initialization

To set up the database and create the initial admin user, run:

```bash
node init-db.js
```

This will create a `database.sqlite` file and an `admins` table with a default user:

- **Username**: `admin`
- **Password**: `admin123`

> **Note**: For security, ensure you change the default credentials and implement password hashing for production.

### Server set-up

To run the application, process the Tailwind CSS, and access the secure admin panel during development, start everything concurrently:

1. Start the development server and Tailwind CSS watcher:

   ```bash
   npm run dev
   ```

2. Access the application:
   - **Main Game**: [http://localhost:3000/](http://localhost:3000/)
   - **Admin Login**: [http://localhost:3000/login](http://localhost:3000/login)
   - **Admin Dashboard**: [http://localhost:3000/admin](http://localhost:3000/admin) (Requires login)

### Production Build

For production, you can build the minified CSS and run the server normally.

1. Build the CSS:
   ```bash
   npm run build
   ```
2. Start the server natively:
   ```bash
   npm start
   ```

To securely manage sessions, you can optionally create a `.env` file in the root directory and define `SESSION_SECRET=your_secret_key`.
