require('dotenv').config(); // Достаем ключи из сейфа
const TelegramBot = require('node-telegram-bot-api');
const token = '8745156023:AAF4ma64qzj7wCwApoNtBbHPHdbGZ-bPgh8';
const bot = new TelegramBot(token, { polling: true });

console.log("Шлюз открыт. Полковник Пинтковский успешно запущен! 🕵🏻‍♂️");

const userStates = {};

// --- НАШИ КЛАВИАТУРЫ (МЕНЮШКИ) ---
// 1. Главное меню
const mainKeyboard = {
	inline_keyboard: [
		[{ text: "👤 Пробив никнейма", callback_data: "module_username" }],
		[{ text: "🌐 IP-Радар", callback_data: "module_ip"}, { text: "🔗 Анализ ссылок", callback_data: "module_url" }],
		[{ text: "⚙️ Мой профиль", callback_data: "menu_profile" }]
	]
};

// 2. Кнопка "Назад"
const backKeyboard = {
	inline_keyboard: [
		[{ text: "🔙 Назад в меню", callback_data: "menu_main" }]
	]
};

// --- СТАРТ ---
bot.onText(/\/start/, (msg) => {
	const chatId = msg.chat.id;
	const userName = msg.from.first_name || "Хакер";

	const welcomeText = `Привет, *${userName}*! 🕵🏻‍♂️\n\nДобро пожаловать в мультитул для разведки по открытым источникам.\n\nВыбери нужный инструмент в меню ниже:`;

	bot.sendMessage(chatId, welcomeText, {
		parse_mode: "Markdown",
		reply_markup: mainKeyboard
	});
});

// --- ОБРАБОТКА НАЖАТИЙ НА КНОПКИ ---
bot.on('callback_query', (query) => {
	const chatId = query.message.chat.id;
	const messageId = query.message.message_id; // ID самого сообщения которое мы будем менять
	const action = query.data; // то что зашито в callback_data кнопки 

	if(action === 'menu_main') {
		// Когда человек нажал "назад" отменяет режим ожидания текста и возвращаем в главное меню
		delete userStates[chatId];
		bot.editMessageText("Главное меню. Выбери нужный инструмент:", {
			chat_id: chatId,
			message_id: messageId, // Указываем какое именно сообщение менять
			reply_markup: mainKeyboard
		});
	} else if (action === 'menu_profile') {
		bot.editMessageText("📊 Твой профиль:\n\nУровень доступа: Базовый\nЗапросов сделано: 0", {
			chat_id: chatId,
			message_id: messageId, // Указываем какое именно сообщение менять
			reply_markup: backKeyboard // Подставляем кнопку "назад"
		});
	} else if (action === 'module_username') {
		userStates[chatId] = 'waiting_for_username';
		bot.editMessageText("🕵🏻‍♂️ Отправь мне никнейм, который нужно проверить (например, google): ", {
			chat_id: chatId,
			message_id: messageId, // Указываем какое именно сообщение менять
			reply_markup: backKeyboard // Подставляем кнопку "назад"
		});
	} else {
		bot.editMessageText("⚠️ Этот модуль пока в разработке.", {
			chat_id: chatId,
			message_id: messageId, // Указываем какое именно сообщение менять
			reply_markup: backKeyboard // Подставляем кнопку "назад"
		});
	}

	// Говорим телеграму что мы обработали клик (чтобы часики на кнопке пропали)
	bot.answerCallbackQuery(query.id);
});

// --- ОБРАБОТКА ОБЫЧНЫХ СООБЩЕНИЙ (ТЕКСТА) ---
bot.on('message', async (msg) => {
	const chatId = msg.chat.id;
	const text = msg.text;

	// Игнорируем технические команды типа /start
	if (!text || text === '/start') return;

	// Проверяем ждет ли бот сейчас никнейм от этого пользователя
	if (userStates[chatId] === 'waiting_for_username') {
		// Очищаем состояние чтобы бот не зациклился
		delete userStates[chatId];

		// Отправляем сообщение-заглушку и запоминаем его ID чтобы потом перезаписать
		const loadingMsg = await bot.sendMessage(chatId, `⏳ Сканирую никнейм: *${text}*...\n_Запускаю параллельные потоки..._`, { parse_mode: "Markdown" });

		// ТУТ БУДЕТ НАСТОЯЩИЙ ПОИСК (FETCH)
		try {
			// МАГИЯ PROMISE.ALL: Летим сразу на 3 сайта одновременно!
			const [githubRes, redditRes, linktreeRes] = await Promise.all([
				fetch(`https://github.com/${text}`),
				fetch(`https://www.reddit.com/user/${text}/about.json`), // Reddit API
				fetch(`https://linktr.ee/${text}`)
			]);

			// Проверяем отчеты
			const gitStatus = githubRes.status === 200 ? `✅ [Найден](https://github.com/${text})` : `❌ Свободен`;	
			const redditStatus = redditRes.status === 200 ? `✅ [Найден](https://reddit.com/${text})` : `❌ Свободен`;
			const linktreeStatus = linktreeRes.status === 200 ? `✅ [Найден](https://linktr.ee/${text})` : `❌ Свободен`;


			const report = `✅ **Отчет по никнейму ${text} готов!**\n\n` +
													 `🐙 Github: ${gitStatus}\n` +
													 `🤖 Reddit: ${redditStatus}\n` +
													 `🌲 LinkTree: ${linktreeStatus}`;

			bot.editMessageText(report, {
				chat_id: chatId,
				message_id: loadingMsg.message_id,
				parse_mode: "Markdown",
				disable_web_page_preview: true,
				reply_markup: backKeyboard // Снова даем возможность вернуться в меню
			});

		} catch (error) {
		// Если вдруг интернет отпадет или сервер ляжет
		bot.editMessageText(`⚠️ Ошибка сканирования: ${error.message}`, {
			chat_id: chatId,
			message_id: loadingMsg.message_id,
			reply_markup: backKeyboard
		});
	}
  } 
});
