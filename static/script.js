// Lấy các element DOM quan trọng ở đầu
const chatbox = document.getElementById('chatbox');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const sampleButton = document.getElementById('sampleButton');
const suggestionsArea = document.getElementById('suggestionsArea');

// Kiểm tra xem các element có tồn tại không
if (!chatbox) console.error("CRITICAL: chatbox element not found!");
if (!userInput) console.error("CRITICAL: userInput element not found!");
if (!sendButton) console.error("CRITICAL: sendButton element not found!");
if (!sampleButton) console.error("CRITICAL: sampleButton element not found!");
if (!suggestionsArea) console.error("CRITICAL: suggestionsArea element not found!");


// --- Lịch sử Chat ---
let chatHistory = [
    { role: 'bot', content: 'Xin chào! Tôi là trợ lý ảo HMS. Tôi có thể giúp gì cho bạn?' }
];

// --- Tin nhắn mẫu ---
const sampleMessages = [
    "Xin chào", "Bạn có thể làm gì?", "Hướng dẫn đặt lịch khám", "Xem lịch hẹn của tôi",
    "Kiểm tra triệu chứng giúp tôi", "Địa chỉ bệnh viện ở đâu?", "Giờ làm việc?", "Cảm ơn"
];

// --- Hàm hiển thị tin nhắn (THÊM LOGGING + TẠM THỜI ĐƠN GIẢN HÓA) ---
function displayMessage(sender, message, isTyping = false) {
    console.log(`[displayMessage] Called. Sender=${sender}, Typing=${isTyping}`); // LOG 1
    if (!message && !isTyping) {
        console.warn("[displayMessage] Message is empty and not typing.");
        // Không return, vẫn tạo div trống để debug
    }

    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message'); // Thêm class chung trước

    if (isTyping) {
        console.log("[displayMessage] Adding typing indicator styles."); // LOG 2
        messageDiv.classList.add('bot-message', 'typing-indicator'); // Thêm class bot
        messageDiv.innerHTML = `<span></span><span></span><span></span>`;
        messageDiv.setAttribute('id', 'typingIndicator');
    } else {
        messageDiv.classList.add(sender === 'user' ? 'user-message' : 'bot-message'); // Thêm class user/bot
        console.log(`[displayMessage] Setting text content for ${sender}: "${message}"`); // LOG 3
        // --- TẠM THỜI LUÔN DÙNG textContent ĐỂ DEBUG ---
        // Thêm tiền tố để chắc chắn thấy được tin nhắn nếu nó xuất hiện
        // messageDiv.textContent = `[${sender.toUpperCase()}] ${message || '(Empty Message!)'}`;
        // --- KHI FIX XONG, BỎ COMMENT PHẦN DƯỚI VÀ XÓA DÒNG TRÊN ---
        
        if (sender === 'bot') {
            if (typeof marked === 'undefined') {
                console.error('[displayMessage] Marked.js library not loaded!');
                messageDiv.textContent = message;
            } else {
                try {
                    messageDiv.innerHTML = marked.parse(message);
                    console.log("[displayMessage] Parsed Markdown for bot message.");
                } catch (error) {
                    console.error('[displayMessage] Error parsing Markdown:', error);
                    messageDiv.textContent = message; // Fallback
                }
            }
        } else {
            messageDiv.textContent = message;
        }
        
    }

    // Thêm vào DOM
    try {
        if (chatbox) {
            chatbox.appendChild(messageDiv);
            console.log("[displayMessage] Message div successfully appended to chatbox."); // LOG 4
            // Cuộn xuống tin nhắn mới nhất
            chatbox.scrollTop = chatbox.scrollHeight;
            console.log("[displayMessage] Scrolled chatbox."); // LOG 5
        } else {
            console.error("[displayMessage] Chatbox element is NULL when trying to append!");
        }
    } catch (e) {
        console.error("[displayMessage] Error during appendChild:", e);
    }

    return messageDiv;
}

// --- Hàm Typing Indicator ---
function showTypingIndicator() {
    console.log("[showTypingIndicator] Called.");
    removeTypingIndicator(); // Xóa cái cũ trước
    displayMessage('bot', '', true);
}
function removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
         console.log("[removeTypingIndicator] Found indicator.");
        try {
            if (indicator.parentNode === chatbox) {
                 chatbox.removeChild(indicator);
                 console.log("[removeTypingIndicator] Indicator removed.");
            } else {
                 console.warn("[removeTypingIndicator] Indicator parent is not chatbox.");
                 // Thử xóa trực tiếp nếu parent không đúng
                 // indicator.remove();
            }
        } catch(e) {
             console.error("[removeTypingIndicator] Error removing indicator:", e);
        }
    } else {
         console.log("[removeTypingIndicator] No indicator found to remove.");
    }
}

// --- Hàm gửi tin nhắn (THÊM LOGGING) ---
async function sendMessage(messageToSend = null) {
    const userMessage = messageToSend !== null ? messageToSend : userInput.value.trim();
    console.log(`[sendMessage] Called. Message: "${userMessage}"`); // LOG 6
    if (!userMessage) {
        console.log("[sendMessage] Empty message, not sending."); // LOG 7
        return;
    }

    if (messageToSend === null && userInput) { // Chỉ xóa nếu lấy từ input
        userInput.value = '';
    }

    // Ẩn khu vực gợi ý
    if (suggestionsArea) {
        suggestionsArea.style.display = 'none';
        console.log("[sendMessage] Suggestions area hidden.");
    } else {
        console.warn("[sendMessage] suggestionsArea not found when trying to hide.");
    }

    // Hiển thị tin nhắn người dùng
    displayMessage('user', userMessage);
    // Thêm vào lịch sử
    chatHistory.push({ role: 'user', content: userMessage });

    // Hiển thị typing
    showTypingIndicator();

    console.log("[sendMessage] Sending fetch request to /chat"); // LOG 8
    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userMessage, history: chatHistory.slice(0, -1) }), // Gửi lịch sử cũ
        });
        console.log("[sendMessage] Fetch response received. Status:", response.status); // LOG 9

        if (!response.ok) {
            // Ghi lại nội dung lỗi nếu có thể
            let errorBody = await response.text();
            console.error("[sendMessage] HTTP Error Body:", errorBody);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const botResponse = data.response;
        console.log("[sendMessage] Bot response data from server:", botResponse); // LOG 10

        // Chờ 1 giây rồi hiển thị
        console.log("[sendMessage] Waiting 1 second before showing bot response..."); // LOG 11
        setTimeout(() => {
            console.log("[sendMessage] Timeout finished. Removing indicator, showing bot message."); // LOG 12
            removeTypingIndicator();
            const botMessageDiv = displayMessage('bot', botResponse);
            if (botMessageDiv) { // Chỉ thêm vào history nếu display thành công
                 chatHistory.push({ role: 'bot', content: botResponse });
            } else {
                console.error("[sendMessage] Failed to display bot message, not adding to history.");
            }
        }, 1000);

    } catch (error) {
        console.error('[sendMessage] Fetch Error:', error);
        setTimeout(() => {
             removeTypingIndicator();
             displayMessage('bot', 'Xin lỗi, đã có lỗi xảy ra khi kết nối. Vui lòng thử lại.');
        }, 500);
    }
}

// --- Hàm xử lý khu vực gợi ý ---
function populateSuggestions() {
    if (!suggestionsArea) { console.error("[populateSuggestions] suggestionsArea is null!"); return; }
    console.log("[populateSuggestions] Populating suggestions.");
    suggestionsArea.innerHTML = ''; // Xóa nội dung cũ

    const title = document.createElement('div');
    title.className = 'suggestions-title';
    title.textContent = 'Chọn một tùy chọn hoặc nhập tin nhắn của riêng bạn';
    suggestionsArea.appendChild(title);

    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'suggestion-buttons';

    sampleMessages.forEach(msg => {
        const button = document.createElement('button');
        button.className = 'sample-message-button';
        button.textContent = msg;
        button.addEventListener('click', () => {
            console.log(`[Suggestion Click] Sending message: "${msg}"`);
            sendMessage(msg);
        });
        buttonsContainer.appendChild(button);
    });
    suggestionsArea.appendChild(buttonsContainer);
}

function removeSuggestionsContainer() {
    // Không xóa container tĩnh, chỉ ẩn nó đi
    if (suggestionsArea) {
        suggestionsArea.style.display = 'none';
        console.log("[removeSuggestionsContainer] Suggestions area hidden.");
    }
}

// --- Gán sự kiện ---
if (sendButton) {
    sendButton.addEventListener('click', () => sendMessage());
}
if (userInput) {
    userInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') sendMessage();
    });
}
if (sampleButton) {
    sampleButton.addEventListener('click', (event) => {
        event.stopPropagation();
        if (!suggestionsArea) { console.error("[sampleButton Click] suggestionsArea is null!"); return; }
        console.log("[sampleButton Click] Toggling suggestions.");
        if (suggestionsArea.style.display === 'none' || suggestionsArea.style.display === '') {
            populateSuggestions();
            suggestionsArea.style.display = 'block';
             // Scroll chatbox xuống để đảm bảo không bị che lấp khi gợi ý hiện ra
            if(chatbox) chatbox.scrollTop = chatbox.scrollHeight;
        } else {
            suggestionsArea.style.display = 'none';
        }
    });
}

// Đóng gợi ý khi click ra ngoài
document.addEventListener('click', (event) => {
    if (!suggestionsArea) return; // Kiểm tra null
    // Chỉ đóng nếu đang hiển thị
    if (suggestionsArea.style.display === 'block') {
         // Kiểm tra click có nằm ngoài khu vực gợi ý VÀ ngoài nút mở không
        if (!suggestionsArea.contains(event.target) && event.target !== sampleButton) {
            console.log("[document Click] Clicked outside, hiding suggestions.");
            suggestionsArea.style.display = 'none';
        }
    }
});


// --- window.onload (Dùng bản đơn giản hóa + Log) ---
window.onload = () => {
     console.log("[window.onload] Page loaded."); // LOG 13
     // Lấy lại tham chiếu ở đây để chắc chắn DOM đã sẵn sàng
     const localChatbox = document.getElementById('chatbox');
     const localSuggestionsArea = document.getElementById('suggestionsArea');

     if(!localChatbox) { console.error("[onload] Chatbox element not found!"); return; }
     if(!localSuggestionsArea) { console.error("[onload] SuggestionsArea element not found!"); }

     // Luôn hiển thị tin nhắn đầu tiên từ history nếu có
     if (chatHistory.length > 0 && chatHistory[0].role === 'bot') {
        console.log("[onload] Displaying initial bot message."); // LOG 14
        displayMessage('bot', chatHistory[0].content);
     } else {
        console.log("[onload] No initial bot message in history or history empty."); // LOG 15
     }
     // Đảm bảo gợi ý ẩn khi tải trang
     if (localSuggestionsArea) {
         localSuggestionsArea.style.display = 'none';
          console.log("[onload] Suggestions area hidden on load.");
     }
};