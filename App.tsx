import nodejs from 'nodejs-mobile-react-native';
import { useEffect, useState, useRef } from 'react';
import { pick, types } from '@react-native-documents/picker';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: number;
}

function App() {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [currentToolCall, setCurrentToolCall] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    nodejs.start('main.js');
  }, []);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: Date.now(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    setInputText('');

    const aiMessageId = (Date.now() + 1).toString();
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    try {
      // @ts-ignore
      const response = await global.streamingFetch(
        'http://localhost:3000/message/stream',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userMessage.text }),
          reactNative: { textStreaming: true },
        },
      );

      // Check for error status before attempting to read stream
      if (!response.ok) {
        // Don't try to read response.text() as it may use TextDecoder
        const statusMessage =
          response.status === 503
            ? 'Agent not initialized. Please upload both a vault.json file and a .smyth agent file through the app.'
            : `Server error (${response.status})`;

        Alert.alert('Error', statusMessage);
        return;
      }

      if (!response.body) {
        throw new Error('Streaming not supported — response.body is undefined');
      }

      reader = response.body.getReader();
      let aiText = '';
      let leftover = '';
      let aiMessageStarted = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          setCurrentToolCall(null);
          break;
        }

        // Convert chunk to string
        const chunk = String.fromCharCode(...value);

        console.log('chunk', chunk);

        // Check for error in SSE data
        if (chunk?.startsWith('{"error":')) {
          try {
            const errorData = JSON.parse(chunk);
            Alert.alert('Error', errorData.error);
            // Close the reader and exit
            if (reader) {
              reader.cancel();
            }
            setCurrentToolCall(null);
            return;
          } catch (e) {
            console.error('Error parsing error chunk:', e);
          }
        }

        const text = leftover + chunk;

        const lines = text.split('\n');
        leftover = lines.pop() || '';

        for (let line of lines) {
          if (!line.startsWith('data:')) continue;

          try {
            const parsed = JSON.parse(line.replace('data:', '').trim());

            if (parsed.chunk) {
              setCurrentToolCall(null);
              aiText += parsed.chunk;

              if (!aiMessageStarted) {
                setChatMessages(prev => [
                  ...prev,
                  {
                    id: aiMessageId,
                    text: aiText,
                    isUser: false,
                    timestamp: Date.now(),
                  },
                ]);
                aiMessageStarted = true;
              } else {
                setChatMessages(prev =>
                  prev.map(m =>
                    m.id === aiMessageId ? { ...m, text: aiText } : m,
                  ),
                );
              }

              // Auto-scroll to bottom as AI types
              scrollViewRef.current?.scrollToEnd({ animated: true });
            } else if (parsed.toolCall) {
              setCurrentToolCall(parsed.toolCall.tool.name);
              scrollViewRef.current?.scrollToEnd({ animated: true });
            } else if (parsed.done) {
              setCurrentToolCall(null);
            } else if (parsed.error) {
              // Handle error in SSE stream
              Alert.alert('Error', parsed.error);
              if (reader) {
                reader.cancel();
              }
              setCurrentToolCall(null);
              return;
            }
          } catch (e) {
            console.log('JSON parse error:', e);
          }
        }
      }
    } catch (err) {
      console.error('Streaming error:', err);
      setCurrentToolCall(null);

      // Make sure to clean up the reader
      if (reader) {
        try {
          await reader.cancel();
        } catch (cancelErr) {
          console.error('Error cancelling reader:', cancelErr);
        }
      }
    }
  };

  const pickAndUploadAgent = async () => {
    if (isUploading) {
      console.log('Upload already in progress, ignoring request');
      return;
    }

    try {
      setIsUploading(true);

      const result = await pick({
        type: [types.allFiles],
      });

      if (!result || result.length === 0) {
        console.log('No file selected');
        setIsUploading(false);
        return;
      }

      const res = result[0];
      console.log('Agent file picked:', res);

      if (!res.uri) {
        Alert.alert('Error', 'Invalid file selected. Please try again.');
        setIsUploading(false);
        return;
      }

      // Read the file content (same as vault upload)
      console.log('Reading agent file content...');
      const fileContent = await fetch(res.uri).then(r => r.text());

      // Parse and validate JSON
      let agentData;
      try {
        agentData = JSON.parse(fileContent);
      } catch (parseErr) {
        console.error('JSON parse error:', parseErr);
        Alert.alert(
          'Error',
          'Invalid JSON file. Please check the file format.',
        );
        setIsUploading(false);
        return;
      }

      // Upload agent data as JSON (same as vault upload)
      console.log('Uploading agent file to server...');
      const response = await fetch('http://localhost:3000/upload-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentData),
      });

      if (!response.ok) {
        // Don't use response.statusText as it may cause TextDecoder errors
        const errorMsg =
          response.status === 503
            ? 'Server not ready. Please try again.'
            : `Upload failed with status ${response.status}`;
        Alert.alert('Error', errorMsg);
        setIsUploading(false);
        return;
      }

      let json;
      try {
        json = (await response.json()) as {
          success: boolean;
          error?: string;
          message?: string;
        };
      } catch (parseErr) {
        console.error('Failed to parse response:', parseErr);
        Alert.alert('Error', 'Invalid server response');
        setIsUploading(false);
        return;
      }

      if (json.success) {
        // Use the server's message which accurately reflects what happened
        Alert.alert('Success', json.message || 'Agent uploaded successfully!');
        setChatMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            text: `System: ${json.message || 'Agent file uploaded.'}`,
            isUser: false,
            timestamp: Date.now(),
          },
        ]);
      } else {
        Alert.alert('Error', json.error || 'Failed to upload agent');
      }

      setIsUploading(false);
    } catch (err) {
      console.error('Agent upload error:', err);
      setIsUploading(false);

      // More specific error messages
      const errorMessage = (err as any).message || '';

      if (
        errorMessage.includes('canceled') ||
        errorMessage.includes('cancelled')
      ) {
        console.log('File picker cancelled by user');
        return;
      }

      if (
        errorMessage.includes('Network request failed') ||
        errorMessage.includes('fetch')
      ) {
        Alert.alert(
          'Error',
          'Network error. Please check if the server is running.',
        );
      } else if (errorMessage.includes('Server returned')) {
        Alert.alert('Error', `Upload failed: ${errorMessage}`);
      } else {
        Alert.alert(
          'Error',
          `Failed to upload agent: ${errorMessage || 'Unknown error'}`,
        );
      }
    }
  };

  const pickAndUploadVault = async () => {
    if (isUploading) {
      console.log('Upload already in progress, ignoring request');
      return;
    }

    try {
      setIsUploading(true);

      const result = await pick({
        type: [types.allFiles],
      });

      if (!result || result.length === 0) {
        console.log('No file selected');
        setIsUploading(false);
        return;
      }

      const res = result[0];
      console.log('Vault file picked:', res);

      if (!res.uri) {
        Alert.alert('Error', 'Invalid file selected. Please try again.');
        setIsUploading(false);
        return;
      }

      // Read the file content
      console.log('Reading vault file content...');
      const fileContent = await fetch(res.uri).then(r => r.text());

      // Parse and validate JSON
      let vaultData;
      try {
        vaultData = JSON.parse(fileContent);
      } catch (parseErr) {
        console.error('JSON parse error:', parseErr);
        Alert.alert(
          'Error',
          'Invalid JSON file. Please check the file format.',
        );
        setIsUploading(false);
        return;
      }

      // Upload vault data as JSON
      console.log('Uploading vault file to server...');
      const response = await fetch('http://localhost:3000/upload-vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vaultData),
      });

      if (!response.ok) {
        // Don't use response.statusText as it may cause TextDecoder errors
        const errorMsg =
          response.status === 503
            ? 'Server not ready. Please try again.'
            : `Upload failed with status ${response.status}`;
        Alert.alert('Error', errorMsg);
        setIsUploading(false);
        return;
      }

      let json;
      try {
        json = (await response.json()) as {
          success: boolean;
          error?: string;
          message?: string;
        };
      } catch (parseErr) {
        console.error('Failed to parse response:', parseErr);
        Alert.alert('Error', 'Invalid server response');
        setIsUploading(false);
        return;
      }

      if (json.success) {
        Alert.alert(
          'Success',
          json.message || 'Vault file uploaded successfully!',
        );
        setChatMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            text: `System: ${json.message || 'Vault file uploaded.'}`,
            isUser: false,
            timestamp: Date.now(),
          },
        ]);
      } else {
        Alert.alert('Error', json.error || 'Failed to upload vault file');
      }

      setIsUploading(false);
    } catch (err) {
      console.error('Vault upload error:', err);
      setIsUploading(false);

      // More specific error messages
      const errorMessage = (err as any).message || '';

      if (
        errorMessage.includes('canceled') ||
        errorMessage.includes('cancelled')
      ) {
        console.log('File picker cancelled by user');
        return;
      }

      if (
        errorMessage.includes('Network request failed') ||
        errorMessage.includes('fetch')
      ) {
        Alert.alert(
          'Error',
          'Network error. Please check if the server is running.',
        );
      } else if (errorMessage.includes('Server returned')) {
        Alert.alert('Error', `Upload failed: ${errorMessage}`);
      } else {
        Alert.alert(
          'Error',
          `Failed to upload vault: ${errorMessage || 'Unknown error'}`,
        );
      }
    }
  };

  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent
        chatMessages={chatMessages}
        inputText={inputText}
        setInputText={setInputText}
        sendMessage={sendMessage}
        scrollViewRef={scrollViewRef}
        currentToolCall={currentToolCall}
        onUploadAgentPress={pickAndUploadAgent}
        onUploadVaultPress={pickAndUploadVault}
      />
    </SafeAreaProvider>
  );
}

interface AppContentProps {
  chatMessages: ChatMessage[];
  inputText: string;
  setInputText: (text: string) => void;
  sendMessage: () => void;
  scrollViewRef: React.RefObject<ScrollView | null>;
  currentToolCall: string | null;
  onUploadAgentPress: () => void;
  onUploadVaultPress: () => void;
}

function AppContent({
  chatMessages,
  inputText,
  setInputText,
  sendMessage,
  scrollViewRef,
  currentToolCall,
  onUploadAgentPress,
  onUploadVaultPress,
}: AppContentProps) {
  const safeAreaInsets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: safeAreaInsets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? safeAreaInsets.top : 0}
    >
      <View style={styles.header}>
        <Text style={styles.title}>SmythOS Chat</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            onPress={onUploadVaultPress}
            style={styles.uploadButton}
          >
            <Text style={styles.uploadButtonText}>Upload Vault</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onUploadAgentPress}
            style={styles.uploadButton}
          >
            <Text style={styles.uploadButtonText}>Upload Agent</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.chatContainer}
        showsVerticalScrollIndicator={false}
      >
        {chatMessages.length === 0 ? (
          <Text style={styles.emptyMessage}>
            Start a conversation with the Agent
          </Text>
        ) : (
          chatMessages.map(message => (
            <View
              key={message.id}
              style={[
                styles.messageContainer,
                message.isUser ? styles.userMessage : styles.aiMessage,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  message.isUser
                    ? styles.userMessageText
                    : styles.aiMessageText,
                ]}
              >
                {message.text}
              </Text>
            </View>
          ))
        )}
        {currentToolCall && (
          <View style={[styles.messageContainer, styles.toolCallMessage]}>
            <Text style={[styles.messageText, styles.toolCallText]}>
              Calling skill: {currentToolCall}...
            </Text>
          </View>
        )}
      </ScrollView>

      <View
        style={[
          styles.inputContainer,
          { paddingBottom: safeAreaInsets.bottom },
        ]}
      >
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type your message..."
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            !inputText.trim() && styles.sendButtonDisabled,
          ]}
          onPress={sendMessage}
          disabled={!inputText.trim()}
        >
          <Text
            style={[
              styles.sendButtonText,
              !inputText.trim() && styles.sendButtonTextDisabled,
            ]}
          >
            Send
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  uploadButton: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  chatContainer: {
    flexGrow: 1,
    padding: 16,
  },
  emptyMessage: {
    textAlign: 'center',
    fontSize: 16,
    color: '#6c757d',
    marginTop: 50,
  },
  messageContainer: { marginVertical: 4, maxWidth: '80%' },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#44c9a9',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  messageText: { fontSize: 16, lineHeight: 20 },
  userMessageText: { color: '#ffffff' },
  aiMessageText: { color: '#1a1a1a' },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e1e5e9',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    backgroundColor: '#f8f9fa',
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: { backgroundColor: '#c6c6c8' },
  sendButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  sendButtonTextDisabled: { color: '#8e8e93' },
  toolCallMessage: {
    // backgroundColor: '#fff3cd',
    // borderColor: '#ffeeba',
    // borderStyle: 'dashed',
  },
  toolCallText: {
    color: '#856404',
    fontStyle: 'italic',
    fontSize: 14,
  },
});

export default App;
