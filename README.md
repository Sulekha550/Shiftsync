ShiftSync — Employee Shift Scheduling & Attendance Management System
A production-ready, full-stack MERN application for managing employee shifts, attendance, and leave requests with role-based access control.

🚀 Tech Stack
Layer	Technology
Frontend	React 18 + Vite, Tailwind CSS, React Router v6
Backend	Node.js, Express.js
Database	MongoDB + Mongoose
Auth	JWT (Access + Refresh tokens, HTTP-only cookies)
Charts	Recharts
Validation	Joi (backend), HTML5 + manual (frontend)
📁 Project Structure
shiftsync/
├── backend/
│   ├── config/
│   │   └── db.js                  # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js      # Register, login, logout, refresh
│   │   ├── employeeController.js  # CRUD + stats
│   │   ├── shiftController.js     # Shift management + overlap detection
│   │   ├── attendanceController.js# Check-in/out + history
│   │   └── leaveController.js     # Apply, review, cancel leave
│   ├── middleware/
│   │   ├── authMiddleware.js      # JWT protect + role authorization
│   │   └── errorMiddleware.js     # Centralized error handling
│   ├── models/
│   │   ├── User.js                # Auth user (bcrypt, refresh tokens)
│   │   ├── Employee.js            # Employee profile
│   │   ├── Shift.js               # Shift scheduling
│   │   ├── Attendance.js          # Check-in/out records
│   │   └── Leave.js               # Leave requests
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── employeeRoutes.js
│   │   ├── shiftRoutes.js
│   │   ├── attendanceRoutes.js
│   │   └── leaveRoutes.js
│   ├── utils/
│   │   ├── jwt.js                 # Token generation/verification
│   │   ├── response.js            # Standardized API responses
│   │   └── seeder.js              # Database seeder
│   ├── validators/
│   │   └── index.js               # Joi validation schemas
│   ├── server.js                  # Express app entry point
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── common/
    │   │   │   ├── LoadingSpinner.jsx
    │   │   │   ├── Modal.jsx
    │   │   │   ├── Pagination.jsx
    │   │   │   └── index.jsx      # Badge, StatCard, EmptyState, ConfirmDialog
    │   │   └── layout/
    │   │       ├── AppLayout.jsx
    │   │       ├── Sidebar.jsx
    │   │       └── Navbar.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx    # Global auth state + actions
    │   ├── pages/
    │   │   ├── auth/
    │   │   │   ├── LoginPage.jsx
    │   │   │   └── RegisterPage.jsx
    │   │   ├── dashboard/
    │   │   │   └── DashboardPage.jsx
    │   │   ├── employees/
    │   │   │   └── EmployeesPage.jsx
    │   │   ├── shifts/
    │   │   │   └── ShiftsPage.jsx
    │   │   ├── attendance/
    │   │   │   └── AttendancePage.jsx
    │   │   └── leaves/
    │   │       └── LeavesPage.jsx
    │   ├── services/
    │   │   └── api.js             # Axios instance + all API calls
    │   ├── App.jsx                # Routes + providers
    │   ├── main.jsx
    │   └── index.css              # Tailwind + custom design system
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── package.json
⚙️ Setup & Installation
Prerequisites
Node.js >= 18
MongoDB (local or Atlas)
npm or yarn
1. Clone the repository
git clone https://github.com/yourname/shiftsync.git
cd shiftsync
2. Backend Setup
cd backend
npm install
cp .env.example .env
Edit .env with your values:

PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/shiftsync
JWT_ACCESS_SECRET=your_super_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_key_here
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
CLIENT_URL=http://localhost:5173
Start the backend:

npm run dev
Seed the database with sample data:

npm run seed
3. Frontend Setup
cd ../frontend
npm install
Start the frontend:

npm run dev
Open http://localhost:5173

🔐 Demo Login Credentials
After running npm run seed in the backend:

Role	Email	Password
Admin	admin@shiftsync.com	admin123
Manager	sarah@shiftsync.com	manager123
Manager	mike@shiftsync.com	manager123
Employee	alice@shiftsync.com	emp123
Employee	bob@shiftsync.com	emp123
Employee	carol@shiftsync.com	emp123
You can also use the Quick Demo Login buttons on the login page.

📡 API Reference
Auth — /api/auth
Method	Endpoint	Access	Description
POST	/register	Public	Create account
POST	/login	Public	Login, get tokens
POST	/logout	Private	Logout, clear tokens
POST	/refresh	Public	Refresh access token
GET	/me	Private	Get current user
Employees — /api/employees
Method	Endpoint	Access	Description
GET	/	Admin, Manager	List employees (paginated, filtered)
POST	/	Admin, Manager	Create employee
GET	/:id	Admin, Manager	Get employee details
PUT	/:id	Admin, Manager	Update employee
DELETE	/:id	Admin	Deactivate employee
GET	/stats	Admin, Manager	Employee statistics
Shifts — /api/shifts
Method	Endpoint	Access	Description
GET	/	Admin, Manager	List all shifts
POST	/	Admin, Manager	Create shift (with overlap check)
PUT	/:id	Admin, Manager	Update shift
DELETE	/:id	Admin, Manager	Cancel shift
GET	/my	All	My shifts
Attendance — /api/attendance
Method	Endpoint	Access	Description
POST	/checkin	All	Check in (idempotent)
POST	/checkout	All	Check out
GET	/	Admin, Manager	All attendance records
GET	/my	All	My attendance
GET	/today	All	Today's status
GET	/stats	Admin, Manager	Attendance statistics
Leaves — /api/leaves
Method	Endpoint	Access	Description
POST	/	All	Apply for leave
GET	/	Admin, Manager	All leave requests
GET	/my	All	My leave requests
PATCH	/:id/review	Admin, Manager	Approve/reject leave
PATCH	/:id/cancel	Employee	Cancel own leave
GET	/stats	Admin, Manager	Leave statistics
🏗️ Architecture Highlights
Security
JWT rotation: Refresh tokens are rotated on each use; up to 5 concurrent sessions per user
HTTP-only cookies for token storage to prevent XSS
bcrypt (cost factor 12) for password hashing
Rate limiting on all API routes (200 req/15min) and auth routes (20 req/15min)
Helmet for security headers
Role-based access control (RBAC) on every protected endpoint
Concurrency & Data Integrity
MongoDB transactions used in shift creation to prevent race conditions
Overlap detection logic handles standard and overnight shifts
Idempotent check-in: Uses findOneAndUpdate with upsert to prevent duplicate records
Unique compound indexes on Attendance { employee, date }
Performance
MongoDB indexes on all commonly queried fields
Server-side pagination on all list endpoints
Lean queries (.lean()) for read-only operations to skip Mongoose hydration overhead
Promise.allSettled for parallel data fetching on dashboard
Projection used to exclude sensitive fields (-password -refreshTokens)
Code Quality
MVC pattern with clean separation of controllers, routes, middleware
Centralized error handler with Mongoose/JWT error mapping
Standardized API response helpers (successResponse, errorResponse, paginatedResponse)
Joi validation schemas for all request bodies
🔧 Environment Variables
# Server
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/shiftsync

# JWT Secrets (use long random strings in production)
JWT_ACCESS_SECRET=change_me_in_production
JWT_REFRESH_SECRET=change_me_in_production_too
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# CORS
CLIENT_URL=http://localhost:5173
🐳 Docker Setup (Optional)
# Build and start all services
docker-compose up --build

# Run with detached mode
docker-compose up -d

# Stop
docker-compose down
🧪 Running Tests
# Backend (when test suite added)
cd backend && npm test
📦 Build for Production
# Frontend
cd frontend && npm run build

# Backend
cd backend && NODE_ENV=production node server.js
📬 Postman Collection
Import ShiftSync.postman_collection.json from the root directory into Postman to test all API endpoints.

📄 License
MIT
