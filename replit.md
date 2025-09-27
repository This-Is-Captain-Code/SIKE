# SIKE

## Overview

SIKE is a full-stack web application that enables users to send micro-tips using PYUSD cryptocurrency on the Ethereum Sepolia testnet. The application provides a seamless wallet creation experience with automatic testnet funding and facilitates easy peer-to-peer tipping through a clean, modern interface.

The system handles wallet management, transaction processing, user authentication via Replit's OAuth system, and provides real-time balance tracking. Users can send tips to others by username, with transaction statuses tracked through the blockchain.

**New Feature**: ENS Domain Lookup - Authenticated users can search for Ethereum Name Service (ENS) domains to check availability, view ownership information, get registration cost estimates, and navigate to the official ENS registration site.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management and caching
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with structured route handling
- **Session Management**: Express sessions with PostgreSQL storage
- **Authentication**: Replit OAuth integration using OpenID Connect
- **Middleware**: Custom logging, error handling, and authentication middleware

### Database Architecture
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Management**: Drizzle Kit for migrations and schema definition
- **Connection**: Neon serverless PostgreSQL with connection pooling
- **Tables**: Users, transactions, wallets, and sessions with proper relationships

### Blockchain Integration
- **Network**: Ethereum Sepolia testnet for PYUSD transactions
- **Wallet Management**: Ethers.js for wallet creation and transaction handling
- **Token Standard**: ERC-20 PYUSD token contract integration
- **Transaction Tracking**: Real-time status monitoring and balance updates
- **ENS Integration**: Ethereum mainnet connectivity for ENS domain lookup, name resolution, and availability checking

### Authentication & Authorization
- **Provider**: Replit OAuth with OpenID Connect
- **Session Storage**: PostgreSQL-backed sessions with connect-pg-simple
- **User Management**: Automatic user creation and profile management
- **Security**: HTTP-only cookies with secure session handling

### Development & Build System
- **Development Server**: Vite with hot module replacement
- **Build Process**: Separate frontend (Vite) and backend (esbuild) builds
- **TypeScript**: Strict mode with path mapping for clean imports
- **Environment**: Development/production environment configuration

## External Dependencies

### Core Infrastructure
- **Database**: Neon PostgreSQL serverless database
- **Session Store**: PostgreSQL for session persistence
- **Authentication**: Replit OAuth service

### Blockchain Services
- **RPC Provider**: Infura or similar Ethereum node provider
- **Network**: Ethereum Sepolia testnet
- **Token Contract**: PYUSD ERC-20 contract on Sepolia
- **Faucet**: PYUSD testnet faucet for funding new wallets

### Development Tools
- **Package Manager**: npm with lockfile for dependency management
- **Code Quality**: TypeScript strict mode for type safety
- **UI Library**: Radix UI and shadcn/ui for accessible components
- **Build Tools**: Vite for frontend, esbuild for backend bundling

### Third-Party Libraries
- **Ethers.js**: Ethereum blockchain interaction (Sepolia testnet for PYUSD, mainnet for ENS)
- **TanStack Query**: Server state management and caching
- **Drizzle ORM**: Type-safe database operations
- **Tailwind CSS**: Utility-first styling framework
- **React Hook Form**: Form state management and validation

## Recent Changes

### September 27, 2025 - ENS Domain Lookup Feature
- **Added ENS Service**: Created robust server-side service for ENS domain operations using ethers.js with multiple Ethereum mainnet RPC providers
- **Blockchain Integration**: Real ENS data from Ethereum mainnet with automatic fallback system (4 RPC providers + ENS subgraph API)
- **API Endpoints**: Added authenticated API routes for ENS name availability checking, domain info retrieval, address resolution, and cost estimation
- **Frontend Interface**: Built comprehensive ENS lookup page with search functionality, domain information display, and cost estimates
- **Dashboard Integration**: Added ENS lookup navigation card to the main dashboard
- **Reliability**: Implemented provider rotation, retry logic, and graceful error handling for consistent blockchain connectivity
- **Security**: Implemented Zod validation for all ENS API endpoints with proper error handling
- **User Experience**: Integrated with official ENS registration site for seamless domain registration workflow