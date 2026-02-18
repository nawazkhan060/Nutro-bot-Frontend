// Minimal frontend script for Nutron Chat
// Restores basic UI interactions: theme, sidebar, welcome banner, send message

(function () {
  'use strict';

  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  // Elements
  const chatMessages = $('#chat-messages');
  const userInput = $('#user-input');
  const sendBtn = $('#send-btn');
  const typingIndicator = $('#typing-indicator');
  const micBtn = $('#mic-btn');
  const welcome = document.querySelector('.welcome-banner');
  const welcomeClose = document.querySelector('.welcome-close');
  const sidebar = document.querySelector('.sidebar');
  const sidebarOverlay = $('#sidebar-overlay');
  const sidebarToggle = $('#sidebar-toggle');

  // Text-to-Speech setup
  const synth = window.speechSynthesis;
  let isReadingEnabled = false;

  // Utilities
  function setTheme(isDark) {
    if (isDark) document.body.classList.add('dark-theme');
    else document.body.classList.remove('dark-theme');
    localStorage.setItem('darkTheme', !!isDark);
  }

  function showTyping(show) {
    if (!typingIndicator) return;
    typingIndicator.style.display = show ? 'block' : 'none';
  }

  function readMessageAloud(text) {
    if (!isReadingEnabled || !synth) return;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    synth.speak(utterance);
  }

  function typeMessage(element, text, callback) {
    let i = 0;
    element.innerHTML = '';
    const interval = setInterval(() => {
      if (i < text.length) {
        element.innerHTML += text.charAt(i);
        i++;
        if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
      } else {
        clearInterval(interval);
        if (callback) callback();
      }
    }, 20); // Faster typing speed for better UX
  }

  function appendMessage(sender, text) {
    if (!chatMessages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;

    if (sender === 'ai') {
      messageDiv.innerHTML = `
        <div class="ai-avatar-wrapper">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 8V4H8"></path><rect width="16" height="12" x="4" y="8" rx="2"></rect>
            <path d="M2 14h2"></path><path d="M20 14h2"></path><path d="M15 13v2"></path><path d="M9 13v2"></path>
          </svg>
        </div>
        <div class="bubble ai">
          <div class="ai-header">Nutron-bot</div>
          <div class="ai-content"></div>
        </div>
      `;
      chatMessages.appendChild(messageDiv);
      const contentDiv = messageDiv.querySelector('.ai-content');
      typeMessage(contentDiv, text, () => {
        if (isReadingEnabled) readMessageAloud(text);
      });
    } else {
      messageDiv.innerHTML = `
        <div class="bubble user">
          <p>${text}</p>
        </div>
        <div class="user-avatar-wrapper">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </div>
      `;
      chatMessages.appendChild(messageDiv);
    }

    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;
    appendMessage('user', text);
    userInput.value = '';
    showTyping(true);

    // Auto-scroll to typing indicator
    setTimeout(() => {
      if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 100);

    try {
      // Set a timeout for the fetch request (30 seconds max - Bytez API can be slow)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!resp.ok) {
        appendMessage('ai', 'Server error. Please try again.');
        return;
      }

      const data = await resp.json();
      const reply = data && (data.reply || data.error) ? (data.reply || data.error) : 'No response received.';
      appendMessage('ai', reply);

    } catch (err) {
      if (err.name === 'AbortError') {
        appendMessage('ai', 'The AI is taking too long to respond. Please try again.');
      } else {
        appendMessage('ai', 'Connection error. Please check if the server is running.');
      }
    } finally {
      showTyping(false);
    }
  }

  function initTheme() {
    const stored = localStorage.getItem('darkTheme');
    const isDark = (stored === null) ? true : (stored === 'true');
    setTheme(isDark);

    // Setup theme toggle button
    const themeToggle = $('#theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        const isDarkNow = document.body.classList.contains('dark-theme');
        setTheme(!isDarkNow);
      });
    }
  }

  function initWelcome() {
    if (!welcome) return;
    const dismissed = localStorage.getItem('welcomeDismissed');
    if (dismissed === 'true') welcome.classList.add('collapsed');
    if (welcomeClose) {
      welcomeClose.addEventListener('click', () => {
        welcome.classList.add('collapsed');
        localStorage.setItem('welcomeDismissed', 'true');
      });
    }
  }

  function initSidebar() {
    if (!sidebar) return;
    const open = localStorage.getItem('sidebarOpen') === 'true';
    if (open) document.body.classList.add('sidebar-open');
    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', () => {
        const isOpen = document.body.classList.toggle('sidebar-open');
        localStorage.setItem('sidebarOpen', isOpen);
        sidebarOverlay.hidden = !isOpen;
      });
    }
    if (sidebarOverlay) {
      sidebarOverlay.addEventListener('click', () => {
        document.body.classList.remove('sidebar-open');
        sidebarOverlay.hidden = true;
        localStorage.setItem('sidebarOpen', 'false');
      });
    }
  }

  function initSendHandlers() {
    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (userInput) userInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(); });
  }

  // DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initWelcome();
    initSidebar();
    initSendHandlers();

    // Setup read aloud toggle
    const readAloudToggle = $('#read-aloud-toggle');
    if (readAloudToggle) {
      readAloudToggle.addEventListener('change', (e) => {
        isReadingEnabled = e.target.checked;
      });
    }

    // Compact toggle button
    const compactToggle = $('#compact-toggle');
    if (compactToggle) {
      compactToggle.addEventListener('click', () => {
        const isCompact = document.body.classList.toggle('compact');
        localStorage.setItem('compactMode', isCompact);
      });
      // Restore compact mode from localStorage
      if (localStorage.getItem('compactMode') === 'true') {
        document.body.classList.add('compact');
      }
    }

    // New chat button
    const newChatBtn = $('#new-chat-btn');
    if (newChatBtn) {
      newChatBtn.addEventListener('click', () => {
        if (chatMessages) chatMessages.innerHTML = '';
        if (userInput) userInput.value = '';
      });
    }

    // Save chat button
    const saveChatBtn = $('#save-chat-btn');
    if (saveChatBtn) {
      saveChatBtn.addEventListener('click', () => {
        if (chatMessages) {
          const messages = Array.from(chatMessages.querySelectorAll('.bubble')).map(b => b.textContent);
          if (messages.length > 0) {
            localStorage.setItem('savedChat', JSON.stringify(messages));
            alert('Conversation saved!');
          } else {
            alert('No messages to save.');
          }
        }
      });
    }

    // Clear all chats button
    const clearChatsBtn = $('#clear-chats-btn');
    if (clearChatsBtn) {
      clearChatsBtn.addEventListener('click', () => {
        if (confirm('Are you sure? All conversations will be deleted.')) {
          if (chatMessages) chatMessages.innerHTML = '';
          localStorage.removeItem('savedChat');
          alert('All conversations cleared!');
        }
      });
    }

    // Report issue link
    const reportIssueLink = $('#report-issue-link');
    if (reportIssueLink) {
      reportIssueLink.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'report-issue.html';
      });
    }

    // basic mic button hook
    if (micBtn) micBtn.addEventListener('click', () => {
      micBtn.classList.toggle('listening');
      const status = $('#mic-status');
      if (micBtn.classList.contains('listening')) status && (status.style.display = 'inline');
      else status && (status.style.display = 'none');
    });
  });

})();
