# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Running Locally

To run this project on your local machine, follow these steps:

### 1. Set up your Environment Variables

The project uses Genkit with Google's Gemini model for its AI capabilities. You'll need a Gemini API key.

1.  Create a file named `.env` in the root of the project.
2.  Obtain a Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
3.  Add the following line to your `.env` file, replacing `<YOUR_API_KEY>` with your actual key:

    ```
    GEMINI_API_KEY=<YOUR_API_KEY>
    ```

### 2. Install Dependencies

Open your terminal, navigate to the project directory, and run the following command to install the required packages:

```bash
npm install
```

### 3. Run the Development Servers

You'll need to run two separate processes in two different terminal windows for the application to work correctly: the Next.js frontend and the Genkit AI flows.

**Terminal 1: Start the Next.js App**

```bash
npm run dev
```

This will start the web application, which you can access at [http://localhost:9002](http://localhost:9002).

**Terminal 2: Start the Genkit Flows**

```bash
npm run genkit:dev
```

This will start the Genkit development server, which makes the AI functionality available to your application.

Once both servers are running, you can open your browser to `http://localhost:9002` to use the application.
