# Bushava-Azbuka-Tim2

## Database Setup

This project uses SQLite for data storage.

### Prerequisites

- Node.js installed

### Initialization

To set up the database and create the initial admin user, run:

```bash
node init-db.js
```

This will create a `database.sqlite` file and an `admins` table with a default user:

- **Username**: `admin`
- **Password**: `admin123`

> **Note**: For security, ensure you change the default credentials and implement password hashing for production.
