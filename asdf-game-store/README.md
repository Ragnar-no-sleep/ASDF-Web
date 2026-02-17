# 🛒 ASDF Store

Dark terminal aesthetic e-commerce system built with PHP, MySQL, and vanilla JavaScript.

## ✨ Features

### 🎨 **Apple-Inspired UI/UX** (BONUS #4)

- Smooth animations and transitions
- Dark terminal theme with accent colors
- Responsive grid layout
- Modern typography (SF Pro Display inspired)

### 🔐 **User Authentication**

- Secure registration with password hashing (bcrypt)
- Login with username or email
- Session-based authentication
- Role-based access control (user/admin)

### 🛍️ **Shopping Experience**

- Product catalog with category filtering
- **Search functionality** (BONUS #3) - Real-time product search
- Shopping cart with quantity management
- Stock tracking
- Checkout process with transaction handling

### 📜 **Order History** (BONUS #2)

- Complete order history for users
- Order details with itemized breakdown
- Status tracking (pending/completed)

### 🔧 **Admin Panel**

- Dashboard with key metrics (users, products, orders, revenue)
- **Product management with image upload** (BONUS #1)
  - Create, update, delete products
  - Upload product images (JPG, PNG, GIF, WEBP)
  - Stock management
- User management with analytics
- Recent orders overview

## 🗂️ Project Structure

```
asdf-game-store/
├── admin/
│   ├── dashboard.php      # Admin dashboard
│   ├── products.php       # Product CRUD + image upload
│   └── users.php          # User management
├── assets/
│   ├── css/
│   │   └── style.css      # Apple-inspired dark theme
│   └── img/
│       ├── categories/    # Category placeholder images
│       └── uploads/       # User-uploaded product images
├── database/
│   └── schema.sql         # Database structure + sample data
├── includes/
│   ├── config.php         # Database + security config
│   ├── header.php         # Public header
│   ├── footer.php         # Footer
│   └── header-admin.php   # Admin header
├── articles.php           # Product catalog + search
├── panier.php             # Shopping cart
├── checkout.php           # Order checkout
├── historique.php         # Order history (BONUS #2)
├── login.php              # Login page
├── register.php           # Registration page
├── logout.php             # Logout handler
└── index.php              # Homepage
```

## 🚀 Installation

### 1. Database Setup

```bash
# Create database
mysql -u root -p
CREATE DATABASE asdf_store;
USE asdf_store;

# Import schema
source database/schema.sql;
```

### 2. Configuration

Edit `includes/config.php` to match your database credentials:

```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'asdf_store');
define('DB_USER', 'your_username');
define('DB_PASS', 'your_password');
```

### 3. File Permissions

```bash
chmod 755 assets/img/uploads/
```

### 4. Web Server

Point your web server to the `asdf-game-store/` directory.

**Apache (.htaccess):**

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
```

**PHP Built-in Server (development):**

```bash
php -S localhost:8000
```

## 👤 Default Admin Account

```
Username: admin
Email: admin@asdf.dev
Password: admin123
```

⚠️ **Change this password immediately in production!**

## 🎯 Bonus Features Implemented

✅ **BONUS #1** - Upload images admin

- Multi-format support (JPG, PNG, GIF, WEBP)
- Automatic file naming
- Fallback to category images

✅ **BONUS #2** - Page historique commandes

- Complete order history with details
- Real-time status tracking
- Itemized breakdown

✅ **BONUS #3** - Barre de recherche produits

- Real-time search in product names and descriptions
- Combined with category filtering

✅ **BONUS #4** - Apple UI/UX design

- Dark terminal aesthetic
- Smooth animations
- Modern typography
- Responsive design

## 🔒 Security Features

- Password hashing with `password_hash()` (bcrypt)
- Prepared statements (PDO) to prevent SQL injection
- XSS protection with `htmlspecialchars()`
- Session-based authentication
- Role-based access control
- File upload validation
- CSRF protection ready

## 📊 Database Schema

**Tables:**

- `users` - User accounts with roles
- `items` - Product catalog
- `stock` - Inventory tracking
- `commandes` - Orders
- `commande_items` - Order line items

## 🎨 Design System

**Colors:**

```css
--bg-primary: #0a0e14 /* Dark background */ --bg-secondary: #1a1f29 /* Card background */
  --text-primary: #e6e6e6 /* Main text */ --accent: #00ff88 /* Terminal green */ --danger: #ff4444
  /* Error/delete */ --warning: #ffaa00 /* Warning */;
```

**Typography:**

- Body: SF Pro Display, Segoe UI, Helvetica Neue
- Code: SF Mono, Monaco, Cascadia Code

## 🔄 Future Enhancements

- Payment gateway integration (Stripe, PayPal)
- Email notifications
- Product reviews and ratings
- Wishlist functionality
- Advanced analytics
- Multi-language support
- API endpoints

## 📝 License

Built for ASDF ecosystem - Verify. Burn. Hold.

---

**Verify. Burn. Hold.** 🔥
