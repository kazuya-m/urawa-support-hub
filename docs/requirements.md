# urawa-support-hub Requirements Specification

## 1. System Overview

Build a comprehensive support tool "urawa-support-hub" for Urawa Red Diamonds supporters that
automatically monitors away match ticket sales information and sends reminder notifications via LINE
broadcast messaging before sales start.

## 2. Functional Requirements

### 2.1 Monitoring Function

- **Monitoring Target**: J-League ticket site Urawa Red Diamonds page AWAY tab
  - Main URL: `https://www.jleague-ticket.jp/club/ur/`
  - AWAY tab: `https://www.jleague-ticket.jp/club/ur/?tab=away` (estimated)
- **Monitoring Frequency**: Once daily, executed at 12:00 JST (03:00 UTC) every day
- **Monitoring Period**: Year-round execution, except December (off-season) (January to November)
- **Target Tickets**:
  - Seat categories containing any of "Visitor", "Mix", "Away", "Back Away", "Main Away"
  - Limited to "General Sales" (excludes pre-sales)

### 2.2 Notification Function

- **Notification Destination**: LINE Bot broadcast messaging (to all Bot followers)
- **Notification Timing**:
  1. 20:00 JST on the day before sales start
  2. 1 hour before sales start time
  3. 15 minutes before sales start time

- **Notification Content**:
  - Match name (e.g., "FC Tokyo vs Urawa Red Diamonds")
  - Match date and time
  - Sales start date and time
  - Ticket purchase URL
  - Venue name

### 2.3 Data Management Function

- Ticket sales information retrieval and analysis
- Difference detection with existing data (new/update determination)
- Notification history management (duplicate notification prevention)
- Automatic deletion of data after match date passes (7 days after match date)

### 2.4 System Monitoring Function

- **Error Monitoring**: Immediately catch and notify runtime errors for all functions
- **Health Status Monitoring**: Regular collection and evaluation of system metrics
- **Discord Notification**:
  - Error level-based notifications (warning/error/critical)
  - System status reports (healthy/degraded/down)
  - Detailed information display in rich embed format
- **Log Management**:
  - Persistence of structured logs
  - Analysis and reporting of error trends
  - Preservation of debugging support information

### 2.5 Notification System Integration

- **User Notifications**: LINE (ticket sales information)
- **Developer Notifications**: Discord (system status/errors)
- **Duplicate Prevention**: Duplicate checking by notification type and target
- **Retry Function**: Automatic retry on notification failure (max 3 times, exponential backoff)

## 3. Non-functional Requirements

### 3.1 Performance Requirements

- **Execution Time**: Within 60 seconds (Supabase Edge Functions limitation)
- **Memory Usage**: Within 512MB
- **Response Time**: Scraping processing within 30 seconds

### 3.2 Availability Requirements

- **Uptime**: 99% or higher (excluding December)
- **Fault Response**: Automatic recovery function (fallback URL)
- **Data Consistency**: Complete prevention of duplicate notifications

### 3.3 Monitoring Requirements

- **Error Detection Time**: Within 5 minutes (runtime errors)
- **Notification Send Time**: Within 30 seconds (Discord/LINE)
- **Log Retention Period**: 90 days (for error analysis)
- **Metrics Collection Frequency**: 5-minute intervals

### 3.4 Alert Requirements

- **Error Level Response**:
  - warning: Discord notification only
  - error: Discord notification + log recording
  - critical: Discord notification + log recording + stack trace
- **Escalation**:
  - 3 consecutive critical errors → Special alert
  - 10 or more errors in 24 hours → System degradation warning

### 3.5 Maintainability Requirements

- Resistance to external service changes (repository pattern adoption)
- Easy configuration changes (environment variables and configuration file utilization)
- Debug support through structured log output
- Preventive maintenance through error trend analysis

## 4. Future Feature Extensions

### 4.1 User Management

- Enhanced user targeting options for broadcast messaging
- Individual user preference settings

### 4.2 Enhanced Monitoring

- Home match monitoring
- Pre-sale information monitoring

### 4.3 Advanced Notifications

- Email notification support
- Mobile app push notifications
