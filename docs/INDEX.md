# Documentation Index

This directory contains the comprehensive documentation for the urawa-support-hub project.

## 📚 Essential Documentation (Read in Order)

### 1. Architecture & Design

- **[System Architecture](system-architecture.md)** - Complete hybrid Google Cloud + Supabase
  architecture
- **[Implementation Guide](implementation-guide.md)** - Code patterns, examples, and best practices
- **[Clean Architecture Guide](clean-architecture-guide.md)** - Small-scale project Clean
  Architecture approach

### 2. Development & Testing

- **[Setup Guide](setup-guide.md)** - Environment setup and deployment procedures
- **[Testing Guidelines](testing-guidelines.md)** - Test strategy and patterns

### 3. Technical Decisions

- **[Technology Selection](tech-selection.md)** - Architecture rationale and alternatives
- **[Requirements](requirements.md)** - Functional and non-functional requirements

### 4. Operations

- **[Logging Specification](logging-specification.md)** - Structured logging with Google Cloud
  Logging
- **[Issue Priority Roadmap](issue-priority-roadmap.md)** - Development phases and priorities

### 5. Security

- **[GitHub Secrets Setup](github-secrets-setup.md)** - CI/CD secrets configuration
- **[Security Documentation](security/)** - Authentication, authorization, and RLS policies

## 🎯 Context-Specific Reference Guide

Use this guide to quickly find relevant documentation for your current task:

| Context                   | Primary Documentation                           | Secondary Documentation                                 |
| ------------------------- | ----------------------------------------------- | ------------------------------------------------------- |
| **Design & Architecture** | [System Architecture](system-architecture.md)   | [Clean Architecture Guide](clean-architecture-guide.md) |
| **Implementation**        | [Implementation Guide](implementation-guide.md) | [Testing Guidelines](testing-guidelines.md)             |
| **Technical Choices**     | [Technology Selection](tech-selection.md)       | [Requirements](requirements.md)                         |
| **Security**              | [Security/](security/)                          | [GitHub Secrets Setup](github-secrets-setup.md)         |
| **Testing**               | [Testing Guidelines](testing-guidelines.md)     | [Clean Architecture Guide](clean-architecture-guide.md) |
| **Setup & Deployment**    | [Setup Guide](setup-guide.md)                   | [GitHub Secrets Setup](github-secrets-setup.md)         |

## 🌐 Multi-Language Support

- **English**: Primary language (this directory)
- **日本語**: Secondary language ([docs/ja/](ja/))

**Update Policy**: Always update English docs first, then Japanese follows.

## 📋 Additional Resources

### Specialized Topics

- **[Scraping Target Site Structure](scraping-target-site-structure.md)** - J-League ticket site
  analysis
- **[Data Quality Notifications](issue-data-quality-notification.md)** - Data quality monitoring
  implementation

### Project Management

- **[Issue Priority Roadmap](issue-priority-roadmap.md)** - Complete development roadmap with phases

## 🔍 Quick Navigation

**New to the project?** Start here:

1. [System Architecture](system-architecture.md) - Understand the hybrid architecture
2. [Setup Guide](setup-guide.md) - Get your environment running
3. [Implementation Guide](implementation-guide.md) - Learn coding patterns

**Implementing a feature?** Check:

1. [Implementation Guide](implementation-guide.md) - Code examples and patterns
2. [Testing Guidelines](testing-guidelines.md) - Testing approach
3. [Clean Architecture Guide](clean-architecture-guide.md) - Architecture principles

**Deploying to production?** Follow:

1. [Setup Guide](setup-guide.md) - Deployment procedures
2. [GitHub Secrets Setup](github-secrets-setup.md) - CI/CD configuration
3. [Security Documentation](security/) - Security best practices

## 📖 Documentation Principles

As stated in [CLAUDE.md](../CLAUDE.md):

> Documentation serves as the single source of truth for implementation and operation, not as
> implementation history or migration guides.

All documentation in this directory follows these principles:

- ✅ Current implementation patterns
- ✅ Operational knowledge
- ✅ Technical specifications
- ❌ No implementation process descriptions
- ❌ No historical context
- ❌ No temporary workarounds
