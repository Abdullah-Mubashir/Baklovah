# Baklovah Website Deployment Guide

This guide provides instructions for deploying the Baklovah restaurant website to a production environment like render.com, with emphasis on proper database configuration.

## Prerequisites

- A render.com account (or similar cloud platform)
- An AWS account with S3 access for image storage
- A MySQL-compatible database service (like render.com's PostgreSQL, MySQL on PlanetScale, Amazon RDS, etc.)

## Environment Variables

The following environment variables need to be configured in your production environment:

### Required Environment Variables

```
NODE_ENV=production
PORT=10000 (or any port provided by your hosting platform)

# Database connection - Option 1: Connection URL (recommended)
DATABASE_URL=mysql://username:password@hostname:port/database_name

# Database connection - Option 2: Individual parameters
DB_HOST=your-database-host
DB_USER=your-database-user
DB_PASSWORD=your-database-password
DB_NAME=your-database-name
DB_PORT=3306 (default MySQL port)
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true

# AWS S3 Configuration
AWS_ACCESS_KEY=your-aws-access-key
AWS_SECRET_KEY=your-aws-secret-key
AWS_REGION=us-east-1 (or your preferred region)
S3_BUCKET_NAME=your-bucket-name
```

### Optional Variables

```
DB_TIMEOUT=30000 (connection timeout in ms, default: 30000)
LOG_LEVEL=info (default, options: debug, info, warn, error)
```

## Using render.com for Deployment

1. **Create a new Web Service**
   - Connect your GitHub repository
   - Select the branch to deploy
   - Set the build command: `npm install`
   - Set the start command: `npm start`

2. **Configure Environment Variables**
   - Go to the "Environment" tab in your render.com dashboard
   - Add all required environment variables listed above
   - Set `NODE_ENV=production`

3. **Set up a MySQL Database**
   - Create a MySQL database on render.com, PlanetScale, or Amazon RDS
   - Copy the connection string and set it as `DATABASE_URL` in your environment variables
   - If not using a connection string, set the individual database parameters

4. **Deploy Your Application**
   - Click "Deploy" in the render.com dashboard
   - Monitor the build logs for any issues

## Database Configuration Notes

The application is configured to:
- Use MySQL (or compatible) in production
- Use connection string via DATABASE_URL if available
- Fall back to individual connection parameters if no connection string is provided
- Automatically enable SSL for secure connections in production
- NOT fall back to SQLite in production (will throw an error if database connection fails)

## Testing Your Production Deployment

1. **Initial Verification**
   - Verify the application starts without errors
   - Check server logs for successful database connection
   - Monitor for any AWS S3 connection issues

2. **Functional Testing**
   - Test the admin login
   - Verify menu item display
   - Test adding and updating menu items with images
   - Verify images are correctly uploaded to S3

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` or individual connection parameters are correct
- Check that your database service is running
- Ensure your IP is allowed in any database firewall settings
- Check SSL certificate requirements for your database provider

### AWS S3 Issues
- Verify AWS credentials are correct
- Confirm the S3 bucket exists and is accessible
- Check bucket permissions and CORS configuration
- Verify region settings match between environment and S3 bucket

### Application Errors
- Check logs for specific error messages
- Verify all required environment variables are set
- Ensure database tables are properly created

## Production Best Practices

- Enable automatic SSL certificates on render.com
- Set up uptime monitoring
- Configure log retention and monitoring
- Set up database backups
- Consider using a CDN for improved performance
