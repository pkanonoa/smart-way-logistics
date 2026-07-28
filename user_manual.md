# Smart Way Logistics — User Manual

Welcome to the **Smart Way Logistics Management System**! This comprehensive guide explains the purpose of each module, user role details, and step-by-step instructions on how to run your business operations smoothly using the application.

---

## 👥 User Roles & Permissions

The application implements a secure role-based access system to protect your operational data.

| Feature / Action | Admin / Staff Role | Viewer Role |
| :--- | :---: | :---: |
| View Dashboard & Charts | Yes | Yes |
| Search & View Waybills | Yes | Yes |
| Download Waybill PDF Receipts | Yes | Yes |
| View Staff & Daily Registers | Yes | Yes |
| Create Bookings / Edit Waybills | **Yes** | No (Buttons Hidden) |
| Settle Outstanding Payments | **Yes** | No (Actions Blocked) |
| Record Daily Collections | **Yes** | No |
| Log Attendance & Advances | **Yes** | No |
| Process Weekly Salaries | **Yes** | No |
| User Management (Create/Delete Login Accounts) | **Yes (Admin Only)** | No |

---

## 📁 Modules Breakdown

### 1. 📊 Dashboard (Business Overview)
*   **Purpose**: Provides a real-time health check of your logistics operations.
*   **Key Features**:
    *   **KPI Metrics**: Total Bookings, Active Vehicles, Unsettled Revenue (outstanding payments), and Overdue Bills.
    *   **Interactive Charts**: Daily booking count trends and payment distribution analysis (Paid vs. Pending).
    *   **Quick Links**: Instant access to create a booking or view pending collections.

---

### 2. 📝 Booking & Waybill Management
*   **Purpose**: Creates, tracks, and documents cargo shipments.
*   **How to Use**:
    1.  Go to **New Booking**.
    2.  Fill in the **Route Details** (From and To cities).
    3.  Enter the **Consignor (Sender Company)** details: Business Name, Contact Person, Pickup Address, and GST (if applicable).
    4.  Enter the **Consignee (Receiver)** details: Name, Mobile, Delivery Address, and GST.
    5.  Assign the **Drivers/Staff** responsible for executing the delivery.
    6.  Enter **Parcel Details** (Number of packages, Packaging type, Weight in KG, and Description).
    7.  Input **Charges** (Freight, Handling charges, and GST tax percentages). The system will automatically calculate the **Grand Total**.
    8.  Select the **Payment Mode** (`Paid`, `To Pay` on delivery, or `Credit`).
    9.  *Optional*: Enter E-Way Bill Number. If the Grand Total exceeds ₹50,000, the system will highlight that an E-way Bill is legally required under GST.
*   **PDF Receipts**:
    *   Once a booking is created, click **Print Receipt** or **Download PDF**.
    *   The generated PDF is formatted to standard A4, displaying a clear breakdown, separate Sender/Receiver columns, assigned delivery drivers, and support for a **"DUPLICATE COPY"** watermark.

---

### 3. 👥 Staff, Attendance & Salaries
*   **Purpose**: Manages employee directory, daily attendance, advances, and payroll processing.
*   **Key Sub-Modules**:
    *   **Staff Registry**: Add staff members with their role (Driver, Loader, Operator, Office, or custom roles), contact number, and address.
    *   **Attendance Tracker**: Mark attendance daily (`Present`, `Absent`, or `Half Day`).
    *   **Staff Advances**: Log short-term financial advances given to drivers/helpers. The system tracks whether they have been recovered.
    *   **Salary Processing**: 
        *   Generate salary slips weekly.
        *   Input additions (bonuses/incentives) and recover advances.
        *   The system calculates `Final Payable = Base Wage + Additions - Recovered Advances` automatically.

---

### 4. 🚚 Daily Collections (Daily Register)
*   **Purpose**: Tracks vehicle utilization, trip expenses, and cash collections on a day-to-day basis.
*   **How to Use**:
    1.  Record a new daily register entry by selecting the Date, Vehicle, and Driver.
    2.  Enter the Route and **Start KM / End KM** reading. The system calculates the total distance traveled.
    3.  Log trip-specific expenses: **Fuel Expenses**, **Driver/Helper Wages**, and **Other Expenses** (toll, repairs, etc.).
    4.  Log collections received during the trip (Cash, UPI, or Credit bookings).
    5.  The system calculates the **Balance Difference** (`Collections - Expenses`) to ensure the money deposited matches the trip logs.

---

### 5. 💳 Pending Payments (Outstanding Bills)
*   **Purpose**: Tracks and manages accounts receivable to maintain a healthy cash flow.
*   **Key Features**:
    *   Automatically extracts all waybills booked under `To Pay` (uncollected) or `Credit` modes.
    *   Displays an **Overdue Indicator** showing exactly how many days have passed since the booking.
    *   Allows Admins to click **Settle** directly from the list to record the payment method (Cash, UPI, or Bank Transfer) once paid.

---

### 6. 📈 Reports & Exports
*   **Purpose**: Financial audit and operational analytics.
*   **Key Features**:
    *   Download daily log summaries for accounting.
    *   Export detailed reports to **Microsoft Excel (.xlsx)** for seamless accounting integration.

---

### 7. 🔒 User Management (Admin Only)
*   **Purpose**: Manages system access credentials.
*   **Key Features**:
    *   Create accounts with roles (`Admin`, `Staff`, or `Viewer`).
    *   Includes eye-toggles to safely inspect passwords.
    *   Built-in safety prevents admins from accidentally deleting their own currently logged-in account.
