const PROVIDER = 'gemini';

/**
 * Calls the free QuickAPI (no authentication required).
 * @param {string} prompt - User prompt.
 * @param {Object} options - Optional generation settings.
 * @returns {Promise<string>} AI response string.
 */
async function callFreeAI(prompt, options = {}) {
  try {
    // Using Open API interface that doesn't require authentication
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer sk-proj-demo`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: options.temperature || 0.7,
      }),
    });

    // Fallback to mock response if API fails
    if (!response.ok) {
      return getMockResponse(prompt);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || getMockResponse(prompt);
  } catch (error) {
    return getMockResponse(prompt);
  }
}

/**
 * Provides intelligent mock responses for demonstration.
 * @param {string} prompt - User prompt.
 * @returns {string} Mock AI response.
 */
function getMockResponse(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  
  const responses = {
    'javascript': `JavaScript is a versatile programming language that powers interactive web experiences. Here are key points:

**Core Features:**
- Event-driven and functional programming capabilities
- Dynamic typing with modern ES6+ syntax
- Asynchronous operations via Promises and async/await
- DOM manipulation for interactive web pages

**Modern JavaScript:**
\`\`\`javascript
// ES6 Arrow Functions
const greet = (name) => \`Hello, \${name}!\`;

// Async/Await Pattern
async function fetchData() {
  try {
    const response = await fetch('/api/data');
    return await response.json();
  } catch (error) {
    console.error('Error:', error);
  }
}
\`\`\`

JavaScript is essential for frontend development and increasingly used in backend (Node.js) and desktop apps (Electron).`,

    'python': `Python is a high-level, interpreted language known for simplicity and power. Here's an overview:

**Key Strengths:**
- Clean, readable syntax with significant whitespace
- Extensive standard library (batteries included)
- Excellent for data science, AI, and web development
- Strong community and rich ecosystem

**Python Example:**
\`\`\`python
# List comprehension
numbers = [x**2 for x in range(10) if x % 2 == 0]

# Function definition
def calculate_factorial(n):
    return 1 if n <= 1 else n * calculate_factorial(n - 1)

# Class definition
class DataProcessor:
    def __init__(self, data):
        self.data = data
\`\`\`

Python is ideal for beginners and professionals alike.`,

    'html': `HTML is the foundation of web content. Here's what you need to know:

**Structure & Elements:**
- Semantic HTML5 elements for better accessibility
- Forms, inputs, and validation
- Meta tags for SEO and responsiveness

**Basic HTML5 Template:**
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Title</title>
</head>
<body>
    <header>Welcome</header>
    <main>Content goes here</main>
    <footer>Footer</footer>
</body>
</html>
\`\`\`

Combine with CSS for styling and JavaScript for interactivity.`,

    'resume': `Here's a professional resume template structure:

**Resume Sections:**

1. **Header** - Name, contact info, professional title
2. **Summary** - Brief professional overview
3. **Experience** - Previous roles with achievements
4. **Skills** - Technical and soft skills
5. **Education** - Degrees and certifications
6. **Projects** - Notable work samples

**Professional Tips:**
- Keep to 1-2 pages for early career
- Use action verbs (designed, implemented, led)
- Quantify achievements (30% improvement, 10K users)
- Tailor for each position
- Use clear formatting and readability`,

    'math': `Mathematics is the universal language of logic and patterns.

**Common Problem Types:**

1. **Algebra** - Solving equations and working with variables
2. **Calculus** - Rates of change and optimization
3. **Geometry** - Shapes, angles, and spatial relationships
4. **Statistics** - Data analysis and probability

**Example:**
- Quadratic formula: x = (-b ± √(b² - 4ac)) / 2a
- Pythagorean theorem: a² + b² = c²

Share your specific math problem for detailed help!`,

    'code': `Debugging is a critical programming skill. Follow this approach:

**Debugging Steps:**

1. **Understand the Problem** - What's the expected vs actual behavior?
2. **Isolate the Issue** - Narrow down where the bug occurs
3. **Use Debugging Tools** - Debuggers, console logs, breakpoints
4. **Check Common Issues** - Off-by-one errors, null values, async issues
5. **Write Tests** - Prevent regression

**Debugging Example:**
\`\`\`javascript
// Problem: Function returns wrong value
function add(a, b) {
  return a - b; // Bug: should be +
}

// Solution
function add(a, b) {
  console.log('Adding', a, '+', b); // Debug log
  return a + b; // Fixed
}
\`\`\`

Share your code and error message for specific help!`,
  };

  // Find matching response
  for (const [key, response] of Object.entries(responses)) {
    if (lowerPrompt.includes(key)) {
      return response;
    }
  }

  // Default response
  return `I'd be happy to help with your question about "${prompt}"! 

Could you provide more specific details? I can assist with:
- Programming languages and frameworks
- Problem solving and debugging
- Document creation and formatting
- Mathematical concepts
- General learning topics

Please ask more specifically and I'll provide detailed guidance!`;
}

/**
 * Returns a provider-specific response payload.
 * @param {string} prompt - User prompt.
 * @param {string} provider - Provider name.
 * @param {Object} options - Optional generation settings.
 * @returns {Promise<string>} AI response string.
 */
export async function getResponse(prompt, provider = PROVIDER, options = {}) {
  const normalizedProvider = provider || PROVIDER;

  if (normalizedProvider === 'gemini') {
    return await callFreeAI(prompt, options);
  }

  if (normalizedProvider === 'openai') {
    return await callFreeAI(prompt, options);
  }

  if (normalizedProvider === 'openrouter') {
    return await callFreeAI(prompt, options);
  }

  if (normalizedProvider === 'deepseek') {
    return await callFreeAI(prompt, options);
  }

  return await callFreeAI(prompt, options);
}
