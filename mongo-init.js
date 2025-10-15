// MongoDB initialization script for Docker
// This script sets up the initial database and collections

db = db.getSiblingDB('OneUpDashboard');

// Create collections
db.createCollection('invoices');
db.createCollection('employees');
db.createCollection('synclogs');

// Create indexes for better performance
db.invoices.createIndex({ "invoiceNumber": 1 });
db.invoices.createIndex({ "customerName": 1 });
db.invoices.createIndex({ "invoiceDate": 1 });
db.invoices.createIndex({ "salespersonId": 1 });

db.employees.createIndex({ "employeeId": 1 });
db.employees.createIndex({ "email": 1 });

db.synclogs.createIndex({ "timestamp": 1 });
db.synclogs.createIndex({ "status": 1 });

// Insert sample data (optional)
db.employees.insertOne({
    employeeId: "EMP001",
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@company.com",
    department: "Sales",
    position: "Sales Manager",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
});

print("✅ OneUp Dashboard database initialized successfully!");
print("📊 Collections created: invoices, employees, synclogs");
print("🔍 Indexes created for optimal performance");
print("👤 Sample employee data inserted");
