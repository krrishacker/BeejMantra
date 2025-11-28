import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Mic, MicOff, Bot } from 'lucide-react';

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface ChatbotProps {
  currentLanguage: string;
}

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  language: string;
}

const Chatbot: React.FC<ChatbotProps> = ({ currentLanguage }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Initialize welcome message based on language
  useEffect(() => {
    const welcomeMessage = getWelcomeMessage(currentLanguage);
    setMessages([{
      id: '1',
      text: welcomeMessage,
      isUser: false,
      timestamp: new Date(),
      language: currentLanguage
    }]);
  }, [currentLanguage]);

  // Get welcome message based on language
  const getWelcomeMessage = (language: string): string => {
    switch (language) {
      case 'hi':
      case 'ra':
        return 'Namaste! 🙏 Main aapka AI farming assistant hun. Aap farming ke baare mein kuch bhi puch sakte hain:\n\n🌤️ Weather & climate\n🌱 Soil & fertilizers\n🦠 Disease & pest control\n💰 Market prices\n💧 Water & irrigation\n🌾 Crop management\n\nKoi bhi question puchiye!';
      case 'pa':
        return 'Sat Sri Akal! 🙏 Main tuhada AI farming assistant haan. Tusin farming de baare vich kuch vi puch sakde ho:\n\n🌤️ Weather & climate\n🌱 Soil & fertilizers\n🦠 Disease & pest control\n💰 Market prices\n💧 Water & irrigation\n🌾 Crop management\n\nKoi vi question pucho!';
      case 'gu':
        return 'Jai Shree Krishna! 🙏 Main tamaro AI farming assistant chhu. Tamara farming ne sambandhit koi pan question puch sakta ho:\n\n🌤️ Weather & climate\n🌱 Soil & fertilizers\n🦠 Disease & pest control\n💰 Market prices\n💧 Water & irrigation\n🌾 Crop management\n\nKoi pan question pucho!';
      case 'en':
      default:
        return 'Hello! 🙏 I\'m your AI farming assistant. You can ask me anything about farming:\n\n🌤️ Weather & climate\n🌱 Soil & fertilizers\n🦠 Disease & pest control\n💰 Market prices\n💧 Water & irrigation\n🌾 Crop management\n\nAsk me any question!';
    }
  };
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // AI Response Generator (Advanced farming advice)
  const generateAIResponse = (userQuery: string, language: string): string => {
    const query = userQuery.toLowerCase();
    
    // Hindi/Hinglish responses
    if (language === 'hi' || language === 'ra') {
      // Wheat and grain queries (HIGHEST PRIORITY)
      if (query.includes('wheat') || query.includes('गेहूं') || query.includes('rate') || query.includes('price') || query.includes('भाव') || query.includes('mandi')) {
        return 'Punjab mein wheat ka current rate ₹2,200-2,400 per quintal hai. Mandi mein demand stable hai. Harvesting time mein price increase expected hai. Government MSP ₹2,125 per quintal hai.';
      }
      
      // Weather related queries (ONLY if weather specifically asked)
      if ((query.includes('मौसम') || query.includes('weather') || query.includes('बारिश') || query.includes('rain') || query.includes('sunny') || query.includes('cloudy')) && !query.includes('wheat') && !query.includes('rate') && !query.includes('price')) {
        return 'Aaj ka mausam sunny hai, temperature 28°C. Aap apne crops ko water kar sakte hain. Kal light rain expected hai, so prepare for that. Monsoon mein fungal diseases ka dhyan rakhein. Punjab mein aaj clear weather hai.';
      }
      
      // Fertilizer and soil queries
      if (query.includes('खाद') || query.includes('fertilizer') || query.includes('manure') || query.includes('soil') || query.includes('मिट्टी') || query.includes('organic')) {
        return 'Organic manure use karein - cow dung, vermicompost, neem cake. Chemical fertilizers kam use karein. Soil testing karayein har 6 months mein. pH level 6.0-7.5 maintain karein.';
      }
      
      // Disease and pest queries
      if (query.includes('बीमारी') || query.includes('disease') || query.includes('रोग') || query.includes('pest') || query.includes('कीट') || query.includes('yellow') || query.includes('leaves') || query.includes('पत्ते') || query.includes('crops')) {
        return 'Crop mein yellow leaves dikhein to neem oil spray karein. Regular monitoring zaroori hai. Early morning ya evening mein spray karein. Beneficial insects ko protect karein. Yellow leaves usually nutrient deficiency ya fungal infection ka sign hai.';
      }
      
      // Price and market queries
      if (query.includes('कीमत') || query.includes('price') || query.includes('mandi') || query.includes('market') || query.includes('भाव') || query.includes('turmeric') || query.includes('ginger') || query.includes('cardamom')) {
        return 'Turmeric ka current price ₹120-150/kg hai. Ginger ₹80-100/kg. Cardamom ₹800-1200/kg. Market mein demand stable hai. Export opportunities bhi available hain.';
      }
      
      // Water and irrigation queries
      if (query.includes('पानी') || query.includes('water') || query.includes('irrigation') || query.includes('सिंचाई') || query.includes('drip') || query.includes('mulching')) {
        return 'Drip irrigation use karein water conservation ke liye. Mulching zaroori hai - paddy straw ya plastic mulch. Rainwater harvesting implement karein. Water quality check karein.';
      }
      
      // Crop specific queries
      if (query.includes('turmeric') || query.includes('हल्दी') || query.includes('ginger') || query.includes('अदरक') || query.includes('cardamom') || query.includes('इलायची')) {
        return 'Turmeric: 8-9 months crop cycle, ginger: 8-10 months. Both need well-drained soil. Cardamom: 3-4 years to mature. Regular weeding aur pest control zaroori hai.';
      }
      
      // General farming queries
      if (query.includes('farming') || query.includes('खेती') || query.includes('crop') || query.includes('फसल') || query.includes('yield') || query.includes('उपज')) {
        return 'Modern farming techniques use karein - precision agriculture, crop rotation, intercropping. Soil health maintain karein. Regular soil testing aur crop monitoring zaroori hai.';
      }
      
      // If no specific pattern found, provide helpful guidance
      return 'Aapka question samajh mein aaya. Main farming expert hun. Aap specific problem bata sakte hain: weather, soil, disease, price, water, ya koi specific crop ke baare mein.';
    }
    
    // Punjabi responses
    if (language === 'pa') {
      // Wheat and grain queries (HIGHEST PRIORITY)
      if (query.includes('wheat') || query.includes('ਕਣਕ') || query.includes('rate') || query.includes('price') || query.includes('ਭਾਅ')) {
        return 'Punjab ਵਿੱਚ wheat ਦਾ current rate ₹2,200-2,400 per quintal ਹੈ। Mandi ਵਿੱਚ demand stable ਹੈ। Harvesting time ਵਿੱਚ price increase expected ਹੈ।';
      }
      // Weather related queries (ONLY if weather specifically asked)
      if ((query.includes('ਮੌਸਮ') || query.includes('weather') || query.includes('rain')) && !query.includes('wheat') && !query.includes('rate') && !query.includes('price')) {
        return 'ਅੱਜ ਦਾ ਮੌਸਮ sunny ਹੈ, temperature 28°C। ਤੁਸੀਂ ਆਪਣੇ crops ਨੂੰ water ਕਰ ਸਕਦੇ ਹੋ। ਕੱਲ੍ਹ light rain expected ਹੈ। Monsoon ਵਿੱਚ fungal diseases ਦਾ ਧਿਆਨ ਰੱਖੋ। Punjab ਵਿੱਚ aaj clear weather ਹੈ।';
      }
      if (query.includes('ਖਾਦ') || query.includes('fertilizer') || query.includes('soil')) {
        return 'Organic manure ਵਰਤੋ - cow dung, vermicompost, neem cake। Chemical fertilizers kam ਵਰਤੋ। Soil testing ਕਰਾਓ ਹਰ 6 months ਵਿੱਚ।';
      }
      if (query.includes('ਰੋਗ') || query.includes('disease') || query.includes('pest') || query.includes('yellow') || query.includes('leaves')) {
        return 'Crop ਵਿੱਚ yellow leaves ਦਿਖੇ ਤਾਂ neem oil spray ਕਰੋ। Regular monitoring ਜ਼ਰੂਰੀ ਹੈ। Early morning ਜਾਂ evening ਵਿੱਚ spray ਕਰੋ। Yellow leaves usually nutrient deficiency ਦਾ sign ਹੈ।';
      }
      return 'ਤੁਹਾਡਾ question ਸਮਝ ਵਿੱਚ ਆਇਆ। Main farming expert ਹਾਂ। ਤੁਸੀਂ specific problem ਦੱਸ ਸਕਦੇ ਹੋ।';
    }
    
    // Gujarati responses
    if (language === 'gu') {
      if (query.includes('હવામાન') || query.includes('weather') || query.includes('rain')) {
        return 'આજનું હવામાન sunny છે, temperature 28°C. તમે તમારા crops ને water કરી શકો છો. કાલે light rain expected છે. Monsoon માં fungal diseases નો ધ્યાન રાખો.';
      }
      if (query.includes('ખાતર') || query.includes('fertilizer') || query.includes('soil')) {
        return 'Organic manure વાપરો - cow dung, vermicompost, neem cake. Chemical fertilizers kam વાપરો. Soil testing કરાવો હર 6 months માં.';
      }
      if (query.includes('રોગ') || query.includes('disease') || query.includes('pest')) {
        return 'Crop માં yellow leaves દેખાય તો neem oil spray કરો. Regular monitoring જરૂરી છે. Early morning કે evening માં spray કરો.';
      }
      return 'તમારો question સમજમાં આવ્યો. Main farming expert છું. તમે specific problem કહી શકો છો.';
    }
    
    // English responses
    // Wheat and grain queries (HIGHEST PRIORITY)
    if (query.includes('wheat') || query.includes('rate') || query.includes('price')) {
      return 'Current wheat rate in Punjab: ₹2,200-2,400 per quintal. Market demand is stable. Price increase expected during harvesting time. Government MSP is ₹2,125 per quintal.';
    }
    // Weather related queries (ONLY if weather specifically asked)
    if ((query.includes('weather') || query.includes('rain') || query.includes('sunny') || query.includes('cloudy') || query.includes('temperature')) && !query.includes('wheat') && !query.includes('rate') && !query.includes('price')) {
      return 'Today\'s weather is sunny with temperature around 28°C. You can water your crops. Light rain expected tomorrow, so prepare accordingly. Watch for fungal diseases during monsoon. Punjab has clear weather today.';
    }
    if (query.includes('fertilizer') || query.includes('manure') || query.includes('soil') || query.includes('organic')) {
      return 'Use organic manure - cow dung, vermicompost, neem cake. Minimize chemical fertilizers. Get soil testing done every 6 months. Maintain pH level between 6.0-7.5.';
    }
    if (query.includes('disease') || query.includes('pest') || query.includes('yellow') || query.includes('leaves') || query.includes('fungal') || query.includes('crops')) {
      return 'If you see yellow leaves, spray neem oil. Regular monitoring is important. Spray early morning or evening. Protect beneficial insects. Use integrated pest management. Yellow leaves usually indicate nutrient deficiency or fungal infection.';
    }
    if (query.includes('price') || query.includes('market') || query.includes('turmeric') || query.includes('ginger') || query.includes('cardamom')) {
      return 'Current prices: Turmeric ₹120-150/kg, Ginger ₹80-100/kg, Cardamom ₹800-1200/kg. Market demand is stable. Export opportunities are also available.';
    }
    if (query.includes('water') || query.includes('irrigation') || query.includes('drip') || query.includes('mulching')) {
      return 'Use drip irrigation for water conservation. Mulching is important - use paddy straw or plastic mulch. Implement rainwater harvesting. Check water quality regularly.';
    }
    if (query.includes('turmeric') || query.includes('ginger') || query.includes('cardamom') || query.includes('crop')) {
      return 'Turmeric: 8-9 months crop cycle, Ginger: 8-10 months. Both need well-drained soil. Cardamom: 3-4 years to mature. Regular weeding and pest control is essential.';
    }
    if (query.includes('farming') || query.includes('agriculture') || query.includes('yield') || query.includes('soil')) {
      return 'Use modern farming techniques - precision agriculture, crop rotation, intercropping. Maintain soil health. Regular soil testing and crop monitoring is essential.';
    }
    
    // If no specific pattern found, provide helpful guidance
    return 'I understand your question. I\'m a farming expert. You can ask about specific topics: weather, soil, disease, price, water, or any specific crop. What would you like to know?';
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date(),
      language: currentLanguage
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Simulate AI thinking time
    setTimeout(() => {
      const aiResponse = generateAIResponse(inputText, currentLanguage);
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        isUser: false,
        timestamp: new Date(),
        language: currentLanguage
      };
      
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1000);
  };

  const handleVoiceInput = () => {
    if (!isListening) {
      // Check if browser supports speech recognition
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = getLanguageCode(currentLanguage);
        
        setIsListening(true);
        
        recognition.onstart = () => {
          console.log('Voice recognition started');
        };
        
        recognition.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = event.results[0][0].transcript;
          setInputText(transcript);
          setIsListening(false);
        };
        
        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          // Don't auto-fill text on error, let user type manually
        };
        
        recognition.onend = () => {
          setIsListening(false);
        };
        
        recognition.start();
      } else {
        // Show message that voice input is not supported
        alert('Voice input is not supported in this browser. Please type your question manually.');
        setIsListening(false);
      }
    } else {
      setIsListening(false);
    }
  };

  // Get language code for speech recognition
  const getLanguageCode = (language: string): string => {
    switch (language) {
      case 'hi':
      case 'ra':
        return 'hi-IN';
      case 'pa':
        return 'pa-IN';
      case 'gu':
        return 'gu-IN';
      case 'en':
      default:
        return 'en-IN';
    }
  };

  // Get fallback voice text based on language
  const getFallbackVoiceText = (language: string): string => {
    switch (language) {
      case 'hi':
      case 'ra':
        return 'मेरे crops में yellow leaves आ रहे हैं, क्या करूं?';
      case 'pa':
        return 'ਮੇਰੇ crops ਵਿੱਚ yellow leaves ਆ ਰਹੇ ਹਨ, ਕੀ ਕਰਾਂ?';
      case 'gu':
        return 'મારા crops માં yellow leaves આ રહ્યા છે, શું કરું?';
      case 'en':
      default:
        return 'My crops have yellow leaves, what should I do?';
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-50 flex items-center justify-center"
        title="AI Farming Assistant"
      >
        <MessageCircle className="w-8 h-8" />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-lg shadow-2xl border border-gray-200 z-50 flex flex-col">
          {/* Chat Header */}
          <div className="bg-primary-600 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bot className="w-6 h-6" />
              <div>
                <h3 className="font-semibold">AI Farming Assistant</h3>
                <p className="text-sm text-primary-100">Ask me anything about farming!</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.isUser
                      ? 'bg-primary-600 text-white rounded-br-none'
                      : 'bg-white text-gray-800 rounded-bl-none shadow-sm border'
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                  <p className={`text-xs mt-1 ${
                    message.isUser ? 'text-primary-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-800 rounded-lg rounded-bl-none shadow-sm border px-4 py-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t bg-white rounded-b-lg">
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about farming, weather, crops, prices..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={2}
                />
              </div>
              <div className="flex flex-col space-y-2">
                <button
                  onClick={handleVoiceInput}
                  className={`p-2 rounded-lg transition-colors ${
                    isListening 
                      ? 'bg-red-500 text-white hover:bg-red-600' 
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                  title="Voice Input"
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={!inputText.trim()}
                  className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  title="Send Message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Language Indicator */}
            <div className="mt-2 text-xs text-gray-500 text-center">
              {currentLanguage === 'en' && 'English'}
              {currentLanguage === 'hi' && 'हिंदी'}
              {currentLanguage === 'pa' && 'ਪੰਜਾਬੀ'}
              {currentLanguage === 'gu' && 'ગુજરાતી'}
              {currentLanguage === 'ra' && 'राजस्थानी'}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;
