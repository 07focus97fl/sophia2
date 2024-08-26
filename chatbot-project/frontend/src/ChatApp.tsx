import React, { useState, useRef, useEffect } from 'react';
import { Send, Plus, LogOut, Moon, Sun } from 'lucide-react';

// Define types for props
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
};

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

type CardProps = {
  children: React.ReactNode;
};

type ScrollAreaProps = {
  children: React.ReactNode;
};

// Inline component definitions (with types)
const Button: React.FC<ButtonProps> = ({ children, ...props }) => (
  <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" {...props}>
    {children}
  </button>
);

const Input: React.FC<InputProps> = ({ ...props }) => (
  <input className="px-3 py-2 border rounded" {...props} />
);

const Card: React.FC<CardProps> = ({ children }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">{children}</div>
);

const CardContent: React.FC<CardProps> = ({ children }) => (
  <div className="p-6">{children}</div>
);

const ScrollArea: React.FC<ScrollAreaProps> = ({ children }) => (
  <div className="overflow-auto">{children}</div>
);

// Define types for state
type Conversation = {
  id: number;
  title: string;
};

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

const ChatApp: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState<string>('');
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      setIsLoggedIn(true);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername('');
    setConversations([]);
    setCurrentConversation(null);
    setMessages([]);
  };

  const addNewConversation = () => {
    const newConversation: Conversation = {
      id: Date.now(),
      title: `Conversation ${conversations.length + 1}`,
    };
    setConversations([...conversations, newConversation]);
    setCurrentConversation(newConversation);
    setMessages([]);
  };

  const selectConversation = (conversation: Conversation) => {
    setCurrentConversation(conversation);
    setMessages([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userInput.trim()) {
      setMessages([...messages, { role: 'user', content: userInput }]);
      setUserInput('');
      
      // Simulate AI response
      setTimeout(() => {
        setMessages(prevMessages => [...prevMessages, { role: 'assistant', content: `Hello ${username}, this is a simulated response.` }]);
      }, 1000);
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <Card>
          <CardContent>
            <h2 className="text-2xl font-bold text-center mb-6">Login</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full"
              />
              <Button type="submit" className="w-full">
                Login
              </Button>
            </form>
          </CardContent>
        </Card>
        <Button
          onClick={toggleDarkMode}
          className="absolute top-4 right-4"
        >
          {darkMode ? <Sun className="h-[1.2rem] w-[1.2rem]" /> : <Moon className="h-[1.2rem] w-[1.2rem]" />}
          <span className="sr-only">Toggle dark mode</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <div className="w-64 bg-white dark:bg-gray-800 p-4 border-r border-gray-200 dark:border-gray-700">
        <Button onClick={addNewConversation} className="w-full mb-4">
          <Plus className="mr-2 h-4 w-4" /> New Chat
        </Button>
        <ScrollArea className="h-[calc(100vh-12rem)]">
          {conversations.map((conv) => (
            <Button
              key={conv.id}
              onClick={() => selectConversation(conv)}
              className={`w-full justify-start mb-1 ${currentConversation === conv ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
            >
              {conv.title}
            </Button>
          ))}
        </ScrollArea>
        <Button onClick={handleLogout} className="w-full mt-4 bg-red-500 hover:bg-red-600">
          <LogOut className="mr-2 h-4 w-4" /> Logout
        </Button>
        <Button
          onClick={toggleDarkMode}
          className="w-full mt-2"
        >
          {darkMode ? <Sun className="h-[1.2rem] w-[1.2rem]" /> : <Moon className="h-[1.2rem] w-[1.2rem]" />}
          <span className="sr-only">Toggle dark mode</span>
        </Button>
      </div>
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full p-4">
            {currentConversation ? (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`max-w-[80%] p-3 rounded-lg mb-2 ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white ml-auto'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  {message.content}
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                Select a conversation or start a new one
              </div>
            )}
            <div ref={messagesEndRef} />
          </ScrollArea>
        </div>
        <form onSubmit={handleSubmit} className="p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
          <div className="flex space-x-2">
            <Input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1"
            />
            <Button type="submit">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatApp;