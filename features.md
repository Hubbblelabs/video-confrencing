# Application Features

Based on a comprehensive analysis of the codebase (frontend components, backend modules, and database schema), here is the list of implemented features:

## 1. Authentication & Identity
*   **Multi-Provider Login**: Support for Local (Email/Password), Google, GitHub, Microsoft, Apple, and SAML authentication.
*   **Role-Based Access Control (RBAC)**: Distinct roles for **Student**, **Teacher**, and **Admin**.
*   **User Profiles**: Customizable profiles with bio, specialties, and profile pictures.
*   **Security**: Email verification, password reset flows, and secure token management.

## 2. Video Conferencing (Core)
*   **Room Management**: Create public or private rooms, schedule meetings, or start instant sessions.
*   **Real-Time Media**: High-quality video and audio streaming (WebRTC).
*   **Recording**: Capability to record sessions with cloud storage (S3/GCS integration) and lifecycle management (Start, Stop, Processing).
*   **Participant Management**: Host controls to mute all, kick, or ban participants. Roles within rooms (Moderator, Speaker, Attendee).

## 3. Interactive Collaboration Tools
*   **Real-Time Chat**: In-room messaging with support for file sharing and private messages.
*   **Q&A Module**: Dedicated section for asking questions, with upvoting and moderation (approval) workflows.
*   **Whiteboard**: Interactive whiteboard for real-time collaboration and drawing.
*   **Engagement**: Hand raising and reaction systems.

## 4. Discovery & Scheduling
*   **Session Browser**: "Discovery" section to browse and search for public sessions.
*   **Advanced Filtering**: Filter sessions by category, popularity, price, and recency.
*   **Dashboard**: Personalized dashboard showing upcoming classes and events ("Good Morning/Afternoon" greeting).

## 5. Billing & Commerce
*   **Wallet System**: Built-in digital wallet for students to manage credits.
*   **Transactions**: Support for top-ups, debits (paying for classes), and refunds.
*   **Monetization**: Teachers can host paid sessions.

## 6. Administration & Compliance
*   **Admin Dashboard**: comprehensive overview for platform administrators to manage users and meetings.
*   **Audit Logging**: Immutable audit trails for critical actions (Login, Room Created, User Kicked, etc.) for security and compliance.
*   **Attendance Tracking**: Automated tracking of user participation and duration in sessions.

## 7. Technical Infrastructure
*   **Real-time Signaling**: Socket.io based signaling for immediate state updates.
*   **Scalable Database**: PostgreSQL with Prisma ORM handling complex relationships.
*   **Performance**: Redis caching for session state and media routing.
