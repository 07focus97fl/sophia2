'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Send, Moon, Sun, LogOut } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

type Message = {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [username, setUsername] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [userInput, setUserInput] = useState('')
  const [darkMode, setDarkMode] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (username.trim()) {
      try {
        const response = await fetch('http://localhost:8000/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username: username }),
        })

        if (response.ok) {
          const data = await response.json()
          localStorage.setItem('access_token', data.access_token)
          setIsLoggedIn(true)
          // Removed the initial message
        } else {
          console.error('Login failed')
        }
      } catch (error) {
        console.error('Error during login:', error)
      }
    }
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setUsername('')
    setMessages([])
    setUserInput('')
    localStorage.removeItem('access_token')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (userInput.trim()) {
      const newUserMessage: Message = { role: 'user', content: userInput }
      setMessages(prevMessages => [...prevMessages, newUserMessage])
      setUserInput('')
      
      try {
        const response = await fetch('http://localhost:8000/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
          body: JSON.stringify({
            message: userInput,
            username: username,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          const assistantMessage: Message = { role: 'assistant', content: data.response }
          setMessages(prevMessages => [...prevMessages, assistantMessage])
        } else {
          console.error('Failed to get AI response')
        }
      } catch (error) {
        console.error('Error during chat:', error)
      }
    }
  }

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
  }

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
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
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4"
        >
          {darkMode ? <Sun className="h-[1.2rem] w-[1.2rem]" /> : <Moon className="h-[1.2rem] w-[1.2rem]" />}
          <span className="sr-only">Toggle dark mode</span>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="flex-grow overflow-hidden">
        <CardContent className="h-full flex flex-col p-4">
          <ScrollArea className="flex-grow pr-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
              >
                <div
                  className={`max-w-[70%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </ScrollArea>
          <form onSubmit={handleSubmit} className="mt-4 flex space-x-2">
            <Input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-grow"
            />
            <Button type="submit">
              <Send className="h-4 w-4" />
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="mt-4 flex justify-end space-x-2">
        <Button
          onClick={handleLogout}
          variant="outline"
          size="icon"
        >
          <LogOut className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Logout</span>
        </Button>
        <Button
          onClick={toggleDarkMode}
          variant="outline"
          size="icon"
        >
          {darkMode ? <Sun className="h-[1.2rem] w-[1.2rem]" /> : <Moon className="h-[1.2rem] w-[1.2rem]" />}
          <span className="sr-only">Toggle dark mode</span>
        </Button>
      </div>
    </div>
  )
}