require('dotenv').config(); // Достаем ключи из сейфа
// --- ПУЛЬС ДЛЯ ОБЛАЧНОГО СЕРВЕРА ---
const http = require('http');
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
	res.writeHead(200);
	res.end('Bot is alive and running!');
}).listen(port);
const TelegramBot = require('node-telegram-bot-api');
const token = process.env.TELEGRAM_TOKEN;
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
// 3. Нижняя клавиатура
const bottomKeyboard = {
	keyboard: [
		[{ text: "🖥 Показать меню"}]
	],
	resize_keyboard: true // Делает кнопку аккуратной, чтобы не занимала пол экрана
};

// --- СТАРТ ---
bot.onText(/\/start/, async (msg) => {
	const chatId = msg.chat.id;
	const userName = msg.from.first_name || "Хакер";

	// Сначала кидаем короткое сообщение, чтобы прицепить нижнюю клаву к экрану
	await bot.sendMessage(chatId, "Шлюз открыт. Системная клавиатура загружена 🦇", {
		reply_markup: bottomKeyboard
	});

	const welcomeText = `Привет, *${userName}*! 🕵🏻‍♂️\n\nДобро пожаловать в мультитул для разведки по открытым источникам.\n\nВыбери нужный инструмент в меню ниже:`;

	// Затем сразу кидаем красивое меню с инлайн-кнопками
	bot.sendMessage(chatId, welcomeText, {
		parse_mode: "Markdown",
		reply_markup: mainKeyboard
	});
}); // Закрывает bot.onText(/\/start/, (msg)

// --- ОБРАБОТКА НАЖАТИЙ НА КНОПКИ ---
bot.on('callback_query', (query) => {
	const chatId = query.message.chat.id;
	const messageId = query.message.message_id; // ID самого сообщения которое мы будем менять
	const action = query.data; // то что зашито в callback_data кнопки 

	if(action === 'menu_main') {
		delete userStates[chatId];
		bot.editMessageText("Главное меню. Выбери нужный инструмент:", {
			chat_id: chatId,
			message_id: messageId,
			reply_markup: mainKeyboard
		});
	} else if (action === 'menu_profile') {
		bot.editMessageText("📊 Твой профиль:\n\nУровень доступа: Базовый\nЗапросов сделано: 0", {
			chat_id: chatId,
			message_id: messageId,
			reply_markup: backKeyboard 
		});
	} else if (action === 'module_username') {
		userStates[chatId] = 'waiting_for_username';
		bot.editMessageText("🕵🏻‍♂️ Отправь мне никнейм, который нужно проверить (например, google): ", {
			chat_id: chatId,
			message_id: messageId,
			reply_markup: backKeyboard 
		});
	} else if (action === 'module_ip') {
		userStates[chatId] = 'waiting_for_ip';
		bot.editMessageText("🌐 Отправь мне IP-адрес для проверки (например: 8.8.8.8 или 1.1.1.1):", {
			chat_id: chatId,
			message_id: messageId,
			reply_markup: backKeyboard
		});
	 } else if (action === 'module_url') {
	 	userStates[chatId] = "waiting_for_url";
	 	bot.editMessageText("🔗 Отправь мне подозрительную ссылку для анализа (например: bit.ly/3xyz или scam.com):", {
	 				chat_id: chatId,
	 				message_id: messageId,
	 				reply_markup: backKeyboard
	 	});
	} else {
        // Блок else всегда должен быть последним!
		bot.editMessageText("⚠️ Этот модуль пока в разработке.", {
			chat_id: chatId,
			message_id: messageId,
			reply_markup: backKeyboard 
		});
	}

	bot.answerCallbackQuery(query.id);
});

// --- ОБРАБОТКА ОБЫЧНЫХ СООБЩЕНИЙ (ТЕКСТА) ---
bot.on('message', async (msg) => {
	const chatId = msg.chat.id;
	const text = msg.text;

	if (!text || text === '/start') return;

	// --- ОБРАБОТКА КНОПКИ "Показать меню" ---
	if (text === '🖥 Показать меню') {
		delete userStates[chatId]; // Сбрасываем любой зависший поиск

		const userName = msg.from.first_name || "Хакер";
		const welcomeText = `Главное меню. Выбери нужный инструмент, *${userName}*:`;

		// Выдаем главное меню в ответ на нажатие кнопки
		return bot.sendMessage(chatId, welcomeText, {
			parse_mode: "Markdown",
			reply_markup: mainKeyboard
		});
	}

    // --- МОДУЛЬ 1: ПРОБИВ НИКНЕЙМА ---
	if (userStates[chatId] === 'waiting_for_username') {
		delete userStates[chatId];

		const loadingMsg = await bot.sendMessage(chatId, `⏳ Сканирую никнейм: *${text}*...\n_Запускаю параллельные потоки..._`, { parse_mode: "Markdown" });

		try {
			const [githubRes, redditRes, linktreeRes] = await Promise.all([
				fetch(`https://github.com/${text}`),
				fetch(`https://www.reddit.com/user/${text}/about.json`),
				fetch(`https://linktr.ee/${text}`)
			]);

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
				reply_markup: backKeyboard 
			});

		} catch (error) {
			bot.editMessageText(`⚠️ Ошибка сканирования: ${error.message}`, {
				chat_id: chatId,
				message_id: loadingMsg.message_id,
				reply_markup: backKeyboard
			});
		}
	} 
    
    // --- МОДУЛЬ 2: IP-РАДАР ---
    else if (userStates[chatId] === 'waiting_for_ip') {
		delete userStates[chatId]; 

		const loadingMsg = await bot.sendMessage(chatId, `⏳ Пеленгую IP-адрес: *${text}*...\n_Запрос к базам провайдеров..._`, { parse_mode: "Markdown"});

		try {
			const response = await fetch(`http://ip-api.com/json/${text}?lang=ru`);
			const data = await response.json();

			if (data.status === 'success') {
				const report = `✅ **IP-Радар: Цель обнаружена!**\n\n` +
							   `🌐 IP: \`${data.query}\`\n` +
							   `🏳️ Страна: ${data.country}\n` +
							   `🏙 Город: ${data.city}\n` +
							   `🏢 Провайдер: ${data.isp}\n` +
							   `📍 Координаты: ${data.lat}, ${data.lon}`;

				await bot.editMessageText(report, {
					chat_id: chatId,
					message_id: loadingMsg.message_id,
					parse_mode: "Markdown",
					reply_markup: backKeyboard
				});

				// МАГИЯ: Заставляем Телеграм прислать реальную карту!
				await bot.sendLocation(chatId, data.lat, data.lon);			

			} else {
				bot.editMessageText(`❌ Ошибка: Неверный IP-адрес или цель скрыта.`, {
					chat_id: chatId,
					message_id: loadingMsg.message_id,
					reply_markup: backKeyboard
				});
			}
		} catch (error) {
			bot.editMessageText(`⚠️ Ошибка связи со спутником: ${error.message}`, {
				chat_id: chatId,
				message_id: loadingMsg.message_id,
				reply_markup: backKeyboard
			});
		}
	}

// --- МОДУЛЬ 3: АНАЛИЗ ССЫЛОК ---
else if (userStates[chatId] === 'waiting_for_url') {
	delete userStates[chatId];

	const loadingMsg = await bot.sendMessage(chatId, `⏳ Просвечиваю ссылку рентгеном: *${text}*...`, { parse_mode: "Markdown"});

	try {
		// Умная обработка - если юзер забыл написать http:// , бот подставит сам
		let urlToFetch = text;
		if (!urlToFetch.startsWith('http')) {
			urlToFetch = 'https://' + urlToFetch;
		}

		// Стучимся по ссылке (fetch сам пройдет по всем скрытым редиректам!)
		const response = await fetch(urlToFetch);

		// Достаем финальный адрес, куда нас в итоге привело
		const finalUrl = response.url;

		// Проверяем наличие защищенного соединения
		const inSecure = finalUrl.startsWith('https') ? '✅ Да (HTTPS)' : '❌ Нет ( HTTP - перехват трафика!)';

		let report = `✅ **Анализ ссылки завершен!**\n\n`;

		// Если ссылка изменилась (был редирект) , предупреждаем об этом!
		if (finalUrl !== urlToFetch && finalUrl !== urlToFetch + '/') {
				report += `⚠️ **Обнаружена маскировка (Редирект)!**\n\n`;
		}

		report += `🔗 Исходная: \`${text}\`\n`;
		report += `🎯 Ведет на: \`${finalUrl}\`\n`;
		report += `🔒 Шифрование: \`${inSecure}\n`;
		report += `📡 Статус сервера: \`${response.status} OK`;

		await bot.editMessageText(report, {
				chat_id: chatId,
				message_id: loadingMsg.message_id,
				parse_mode: "Markdown",
				disable_web_page_preview: true, // Выключаем превью, чтобы не спамить картинками сайта
				reply_markup: backKeyboard
			});	
	} catch (error) {
		bot.editMessageText(`❌ Ошибка: Сайт мертв, либо ссылка недействительна.\nДетали: ${error.message}`, {
			chat_id: chatId,
			message_id: loadingMsg.message_id,
			reply_markup: backKeyboard
		});
	}
}
}); // Закрывает весь блок с функционалом