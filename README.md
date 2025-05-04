# Promoter Email Generation UI

This project provides a UI to manage promoter contacts, generate personalized emails using AI, and streamline outreach.

## Features (Planned & Implemented)

*   [ ] Import promoters from Excel file (Drag & Drop)
*   [X] Add promoters manually
*   [X] Display promoters in individual cards
*   [X] Placeholder for AI Email Generation (Individual & All)
*   [X] Edit generated emails
*   [X] Copy generated emails
*   [X] Delete promoter cards
*   [ ] Connect to OpenAI API for actual email generation
*   [ ] Integrate with Supabase for data persistence
*   [ ] Implement actual email sending

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd promoter-email-app
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    # yarn install
    ```

3.  **Run the development server:**
    ```bash
    npm start
    # or
    # yarn start
    ```

    This will open the app in your browser, usually at `http://localhost:3000`.

## Next Steps

*   Integrate an Excel parsing library (e.g., `xlsx`).
*   Implement API calls to OpenAI.
*   Set up Supabase project and integrate client.
*   Implement email sending functionality (e.g., using Supabase functions or a third-party service). 