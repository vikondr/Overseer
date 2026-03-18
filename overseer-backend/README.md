# Overseer Backend

Spring Boot backend with Google OAuth2 authentication.

## Quick Start

### 1. Set Environment Variables

**Windows PowerShell:**
```powershell
$env:JAVA_HOME = "C:\Users\kondr\.jdks\ms-21.0.9"
$env:GOOGLE_CLIENT_ID = "your-client-id"
$env:GOOGLE_CLIENT_SECRET = "your-client-secret"
```

### 2. Build
```bash
.\mvnw clean install
```

### 3. Run
```bash
$env:JAVA_HOME = "C:\Users\kondr\.jdks\ms-21.0.9"
.\mvnw spring-boot:run
```

Server starts at: `http://localhost:8080`

## API Endpoints

### Public
- `GET /` - Server status
- `GET /login` - Login info
- `GET /health` - Health check

### Protected (requires Google login)
- `GET /user` - Current user info
- `GET /profile` - User profile
- `POST /logout` - Logout

## Google Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth2 credentials (Web application)
3. Add redirect URI: `http://localhost:8080/login/oauth2/code/google`
4. Copy Client ID and Secret to environment variables above

## Configuration

Edit `src/main/resources/application.properties`:

```properties
# CORS origins (for frontend)
app.cors.allowed-origins=http://localhost:3000,http://localhost:5173

# Google OAuth2
spring.security.oauth2.client.registration.google.client-id=${GOOGLE_CLIENT_ID:}
spring.security.oauth2.client.registration.google.client-secret=${GOOGLE_CLIENT_SECRET:}
```

## Testing

Open browser: `http://localhost:8080`

Click "Login with Google" to authenticate.

## Frontend Integration

See `REACT_INTEGRATION_EXAMPLE.tsx` for complete React example.

Quick fetch example:
```javascript
fetch('http://localhost:8080/user', {
  credentials: 'include'  // Important!
}).then(r => r.json()).then(console.log);
```

## Stack

- Spring Boot 3.5.9, Spring Security 6.5.7
- Java 21, PostgreSQL driver
- OAuth2 with Google, CORS

## Files

- `README.md` - This file
- `HELP.md` - Original project info
- `.env.example` - Environment variable template
- `REACT_INTEGRATION_EXAMPLE.tsx` - React authentication setup

