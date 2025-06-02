---
trigger: model_decision
description: Allways when making the website
---

We are building a restaurant website that will allow customers to place orders online, with orders visible to a cashier interface for processing. Restaurant name is Baklovah. Our design is inspired by Apple's design language, simple and modern. The main components is the menu page, the order page, and the cashier page. We will use github to publish the code to the public. this will be used by professional business people to build their run their own restaurant websites. Goal is to provide incradible user experience and ease of use for the business people and customers.

Overview of Features
The restaurant website will include the following functionalities:
Menu Management: Store and manage menu items with an admin interface, using Amazon S3 for image storage. Admins will be able to publish new offering items to the menu which customers can immediately see.

Ordering System: Allow customers to place orders online, with orders visible to a cashier interface for processing.

Real-Time Updates: Enable cashiers to update order statuses and time remaining, with customers seeing live updates.

Payment Integration: Process payments securely using Stripe.

Database: Store menu items, orders, and related data efficiently.

Admin Dashboard: Provide analytics showing the most viewed items, most purchased items, and most liked items by customers.

Technology Stack
Backend
Node.js with Express: A lightweight, scalable framework for building APIs and handling real-time features.

Socket.io: For real-time communication between the cashier UI and customer order status pages.

Frontend
HTML, CSS, and JavaScript for a clean, simple design that's easy to edit. We will avoid complex frameworks like React to maintain simplicity in design and implementation.

Stripe JavaScript Library: For client-side payment handling.

Database
MySQL: A relational database for structured data like menu items and orders, with good performance and community support.

Storage
Amazon S3: For storing menu item images securely and scalably.

Authentication
JSON Web Tokens (JWT): To secure admin and cashier interfaces.

Deployment
A cloud platform like AWS EC2, Heroku, or DigitalOcean, with HTTPS for security.

Architecture
The website will follow a client-server architecture with the following components:
Frontend:
Customer Website: Displays the menu and allows ordering. Built with HTML, CSS, and JavaScript for simplicity.

Cashier UI: Shows active orders and allows updates.

Admin Interface: Manages menu items, provides analytics dashboard, and allows customization of the customer website.

Backend:
RESTful API for menu retrieval, order placement, and management.

WebSocket connections for real-time updates.

Database: Stores menu items, orders, and user data (for admin/cashier).

External Services:
Amazon S3 for image storage.

Stripe for payment processing.

Detailed Plan
1. Database Schema
The database will use MySQL with the following tables:
Menu_Items:
id (Primary Key, Integer)

title (VARCHAR, e.g., "Cheeseburger")

description (TEXT, e.g., "Juicy beef patty with cheddar")

price (DECIMAL, e.g., 9.99)

image_url (VARCHAR, URL to S3-hosted image)

Orders:
id (Primary Key, Integer)

order_time (TIMESTAMP, e.g., "2023-10-15 14:30:00")

status (VARCHAR, e.g., "placed", "preparing", "ready", "completed")

total_amount (DECIMAL, e.g., 25.50)

time_remaining (INTEGER, minutes until ready, nullable)

Order_Items:
id (Primary Key, Integer)

order_id (Foreign Key to Orders)

menu_item_id (Foreign Key to Menu_Items)

quantity (Integer, e.g., 2)

Users (for admin and cashier access):
id (Primary Key, Integer)

username (VARCHAR, e.g., "admin1")

password (VARCHAR, hashed)

role (VARCHAR, e.g., "admin", "cashier")

Note: Customer accounts are optional for simplicity; orders can be placed without login.
2. Backend API Endpoints
Using Node.js and Express, the following RESTful endpoints will be implemented:
Menu Management:
GET /api/menu: Fetch all menu items.

POST /api/menu: Add a new menu item (admin only). Body: { title, description, price, image }.

PUT /api/menu/:id: Update a menu item (admin only).

DELETE /api/menu/:id: Delete a menu item (admin only).

Ordering System:
POST /api/orders: Place an order. Body: { items: [{ menu_item_id, quantity }], total_amount }.

GET /api/orders: Retrieve all active orders (cashier only).

PATCH /api/orders/:id: Update order status or time remaining (cashier only). Body: { status, time_remaining }.

Payment:
POST /api/payment: Create a Stripe payment intent. Body: { amount, currency }.

3. Real-Time Updates
Real-time functionality will be implemented using Socket.io:
New Order: When a customer places an order, emit a newOrder event to the cashier UI.

Order Update: When a cashier updates an order (status or time remaining), emit an orderUpdate event to the customer’s order status page.

Connection: Clients (customer and cashier UIs) connect to the WebSocket server and listen for relevant events.

4. Frontend Development
The frontend will consist of three main interfaces:
Customer Website:
Fetch menu items from /api/menu and display them with images, descriptions, and prices.

Allow users to select items and quantities, then submit an order via /api/orders.

After ordering, display a status page with live updates (via WebSockets) showing status and time_remaining.

Cashier UI:
Fetch active orders from /api/orders and display them in a list.

Provide controls to update status (e.g., dropdown) and time_remaining (e.g., input field), sending updates via PATCH /api/orders/:id.

Listen for newOrder events to refresh the list in real-time.

Admin Interface:
Display a form to add new menu items and a list of existing items with edit/delete options.

Use /api/menu endpoints for CRUD operations.

Include file upload for images, which are sent to the backend for S3 storage.

Provide a 'Publish' functionality that immediately makes new menu items visible to customers.

Read the goals2.md file for more info