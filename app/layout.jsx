import "./globals.css";

export const metadata = {
  title: "The Analyst — AI Investment Research Agent",
  description:
    "Give it a company name. It researches the news, the numbers, and the competition — then tells you whether it would invest, and why.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen antialiased bg-paper text-ink dark:bg-darkbg dark:text-darktext transition-colors duration-300">
        {children}
      </body>
    </html>
  );
}

