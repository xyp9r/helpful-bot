require('dotenv').config(); // Достаем ключи из сейфа
// --- ПУЛЬС ДЛЯ ОБЛАЧНОГО СЕРВЕРА ---
const http = require('http');
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
	res.writeHead(200);
	res.end('Bot is alive and running!');
}).listen(port);
const TelegramBot = require('node-telegram-bot-api');
const exifr = require('exifr');
const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: true });

console.log("Шлюз открыт. Полковник Пинтковский успешно запущен! 🕵🏻‍♂️");

const userStates = {};
const searchCache = {}; // Оперативная память для хранения результатов поиска

// --- НАШИ КЛАВИАТУРЫ (МЕНЮШКИ) ---
// 1. Главное меню
const mainKeyboard = {
	inline_keyboard: [
		// Первый этаж (одна широкая кнопка)
		[{ text: "👤 Пробив никнейма", callback_data: "module_username" }],
		
		// Второй этаж (две кнопки пополам)
		[{ text: "🌐 IP-Радар", callback_data: "module_ip"}, { text: "🔗 Анализ ссылок", callback_data: "module_url" }],
		
		// Третий этаж (две кнопки пополам)
		[{ text: "🌍 Доменный радар", callback_data: "module_whois" }, { text: "💰 Крипто-Следопыт", callback_data: "module_crypto" }],

		// Четверный этаж
		[{ text: "📧 Чекер утечек", callback_data: "module_breach"}, { text: "📸 Фото-Криминалист", callback_data: "module_exif"}],

		// Пятый этаж - каталог осинт-инструментов
		[{ text: "🧰 Каталог OSING-тулзов", callback_data: "module_catalog"}],
		
		// Шестой этаж (одна широкая кнопка в самом низу)
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

	const welcomeText = `Привет, *${userName}*! 🕵🏻‍♂️\n\n` +
																		`Добро пожаловать в мультитул для разведки по открытым источникам (OSINT).\n\n` +
																		`📚 **Что умеют модули:**\n` +
																		`👤 *Пробив никнейма* - поиск юзера по базам (Telegram, Github и др.)\n` +
																		`🌐 *IP-Радар - локация, провайдер и точные координаты по IP*\n` +
																		`🔗 *Анализ ссылок* - вскрытие редиректов и проверка URL\n` +
																		`🌍 *Доменный радар* - полная WHOIS-сводка по любому сайту\n` +
																		`💰 *Крипто-Следопыт* - проверка активности криптокошельков (BTC, ETH, TRON)\n` +
																		`📧 *Чекер утечек* - поиск почту в слитых базах Даркнета \n` +
																		`📸 *Фото-Криминалист* - извелечение скрытых геоданных (EXIF) из фото\n\n` +
																		`🧰 *Каталог OSING-тузлов* - набор инструментов для OSINT поиска` +
																		`👇 Выбери нужный инструмент, *${userName}*:`;


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
	} else if (action === 'module_whois') {
		userStates[chatId] = 'waiting_for_whois';
		bot.editMessageText("🌍 Отправь мне домен для пробива (например: scam.com):", {
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
	 } else if (action === 'module_crypto') {
	 	userStates[chatId] = "waiting_for_crypto";
	 	bot.editMessageText("💰 Отправь мне адрес крипто-кошелька (BTC, ETH, TRON) для анализа (например: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa):", {
	 				chat_id: chatId,
	 				message_id: messageId,
	 				reply_markup: backKeyboard
	 	});
	} else if (action === 'module_breach') {
		userStates[chatId] = "waiting_for_email";
		bot.editMessageText("📧 Отправь мне Email для проверки по слитым базам (например: text@gmail.com):", {
					chat_id: chatId,
					message_id: messageId,
					reply_markup: backKeyboard 
		});
	} else if (action === 'expand_breaches') {
		// Достаем сохраненный массив из памяти
		const cache = searchCache[chatId];
		if (!cache) return bot.answerCallbackQuery(query.id, { text: "⚠️ Данные устарели. Пробей почту заново.", show_alert: true});

		const allBreaches = cache.breaches.join(', ');
		const report = `🚨 **ВНИМАНИЕ: Найдена утечка данных!**\n\n` +
					   `📧 Почта: \`${cache.email}\`\n` +
					   `💥 Количество сливов: ${cache.breaches.length}\n\n` +
					   `🏴‍☠️ **Засветилась в базах:**\n${allBreaches}\n\n` +
					   `💡 _Рекомендация: Срочно смените пароли на этих сервисах и поставьте 2FA!_`;
		
        bot.editMessageText(report, {
			chat_id: chatId,
			message_id: messageId,
			parse_mode: "Markdown",
			reply_markup: {
				inline_keyboard: [
					[{ text: "🔼 Свернуть список", callback_data: "collapse_breaches"}],
					[{ text: "🔙 Назад в меню", callback_data: "menu_main"}]
				]
			}
		});
	} else if (action === 'collapse_breaches') {
		const cache = searchCache[chatId];
		if (!cache) return bot.answerCallbackQuery(query.id, { text: "⚠️ Данные устарели. Пробей почту заново", show_alert: true});

		const topBreaches = cache.breaches.slice(0, 10).join(', ');
		const moreCount = `\n_... и еще ${cache.breaches.length - 10} баз_`;

		const report = `🚨 **ВНИМАНИЕ: Найдена утечка данных!**\n\n` +
					   `📧 Почта: \`${cache.email}\`\n` +
					   `💥 Количество сливов: ${cache.breaches.length}\n\n` +
					   `🏴‍☠️ **Засветилась в базах:**\n${topBreaches}${moreCount}\n\n` +
					   `💡 _Рекомендация: Срочно смените пароли на этих сервисах и поставьте 2FA!_`;

		bot.editMessageText(report, {
			chat_id: chatId,
			message_id: messageId,
			parse_mode: "Markdown",
			reply_markup: {
				inline_keyboard: [
					[{ text: `🔽 Показать всё (${cache.breaches.length})`, callback_data: "expand_breaches"}],
					[{ text: "🔙 Назад в меню", callback_data: "menu_main"}]
				]
			}
		});
	} else if (action === 'module_exif') {
		userStates[chatId] = 'waiting_for_photo';
		bot.editMessageText("📸 Отправь мне фотографию **КАК ДОКУМЕНТ/ФАЙЛ** (без сжатия).\n\n_Важно: Если отправить как обычную картинку, Телеграм сответ все GPS-координаты!_", {
			chat_id: chatId,
			message_id: messageId,
			parse_mode: "Markdown",
			reply_markup: backKeyboard
		});
	} else if (action === 'module_catalog') {
			const catalogText = `🧰 **База OSINT-инструментов**\n\n` +
																		`*🔍 Поиск по лицу и фото:*\n` +
																		`• [PimEyes](https://pimeyes.com) — лучший поиск по лицу\n` +
																		`• [FaceCheck.ID](https://facecheck.id) — поиск лица по соцсетям\n` +
																		`• [Google Lens](https://lens.google) — поиск по предметам и интерьеру\n\n` +
																		`*🕸 Графы и связи:*\n` +
																		`• [SpiderFoot](https://github.com/smicallef/spiderfoot) — авто-сбор данных по нику/почте\n` +
																		`• [Maltego](https://www.maltego.com) — построение графов связей\n\n` +
																		`*👤 Никнеймы и соцсети:*\n` +
																		`• [Social-Analyzer](https://github.com/qeeqbox/social-analyzer) — продвинутый поиск никнеймов\n` +
																		`• [220vk](http://new.220vk.ru) — скрытые друзья и история ВК\n` +
																		`• [Social Searcher](https://social-searcher.com) — упоминания в соцсетях\n\n` +
																		`*💾 Архивы:*\n` +
																		`• [Wayback Machine](https://web.archive.org) — история изменения сайтов`;
		
		bot.editMessageText(catalogText, {
			chat_id: chatId,
			message_id: messageId,
			parse_mode: "Markdown",
			disable_web_page_preview: true,
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

	// Если это команда statr - игнорим, она обрабатывается первым блоком
	if (text === '/start') return;

	// если текста нет, и мы щас не ждем фотку в 7 модуле то тоже игнорим
	if (!text && userStates[chatId] !== 'waiting_for_photo') return;

	// --- ОБРАБОТКА КНОПКИ "Показать меню" ---
	if (text === '🖥 Показать меню') {
		delete userStates[chatId]; // Сбрасываем любой зависший поиск

		const userName = msg.from.first_name || "Хакер";
		const welcomeText =`Главное меню. 🕵🏻‍♂️\n\n` +
															`📚 **Что умеют мои модули:**\n` +
															`👤 *Пробив никнейма* — поиск юзера по базам (Telegram, Github и др.)\n` +
															`🌐 *IP-Радар* — локация, провайдер и точные координаты по IP\n` +
															`🔗 *Анализ ссылок* — вскрытие редиректов и проверка URL\n` +
															`🌍 *Доменный радар* — полная WHOIS-сводка по любому сайту\n` +
															`💰 *Крипто-Следопыт* — проверка активности криптокошельков\n` +
															`📧 *Чекер утечек* — поиск почты в слитых базах Даркнета\n` +
															`📸 *Фото-Криминалист* — извлечение скрытых геоданных (EXIF) из фото\n\n` +
															`🧰 *Каталог OSING-тузлов* - набор инструментов для OSINT поиска\n\n` +
															`👇 Выбери нужный инструмент, *${userName}*:`;

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
			const [githubRes, redditRes, linktreeRes, tgRes, habrRes] = await Promise.all([
				fetch(`https://github.com/${text}`),
				fetch(`https://www.reddit.com/user/${text}/about.json`),
				fetch(`https://linktr.ee/${text}`),
				fetch(`https://t.me/${text}`),
				fetch(`https://habr.com/ru/users/${text}/`)
			]);

			// проверка статусов ответа
			const gitStatus = githubRes.status === 200 ? `✅ [Найден](https://github.com/${text})` : `❌ Свободен`;	
			const redditStatus = redditRes.status === 200 ? `✅ [Найден](https://reddit.com/${text})` : `❌ Свободен`;
			const linktreeStatus = linktreeRes.status === 200 ? `✅ [Найден](https://linktr.ee/${text})` : `❌ Свободен`;
			const habrStatus = habrRes.status === 200 ? `✅ [Найден](https://habr.com/ru/users/${text})` : `❌ Свободен`;

			// хитрая проверка телеграм (парсим html)
			// скачиваем код страницы тг
			const tgHtml = await tgRes.text();

			// если на странице есть блок с именем - значит юзер существует
			const tgExists = tgHtml.includes('tgme_page_title');
			const tgStatusCheck = tgExists ? `✅ [Найден](https://t.me/${text})` : `❌ Свободен`;

			// собираем финальный отчет
			const report = `✅ **Отчет по никнейму ${text} готов!**\n\n` +
						   `✈️ Telegram: ${tgStatusCheck}\n`+
						   `🐙 Github: ${gitStatus}\n` +
						   `🤖 Reddit: ${redditStatus}\n` +
						   `🌲 LinkTree: ${linktreeStatus}\n` +
						   `📝 Habr: ${habrStatus}`;

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
		report += `🔒 Шифрование: ${inSecure}\n`;
		report += `📡 Статус сервера: ${response.status} OK`;

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

// --- МОДУЛЬ 4: ДОМЕННЫЙ РАДАР (WHOIS) ---
else if (userStates[chatId] === 'waiting_for_whois') {
	delete userStates[chatId];

	const loadingMsg = await bot.sendMessage(chatId, `⏳ Пробиваю домен: *${text}*...\n_Связываюсь с реестрами..._`, { parse_mode: "Markdown"});

	try {
		// МАГИЯ : Очищаем ввод. Если юзер кинул ссылку с началом https то удаляеме его
		const cleanDomain = text.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split('/')[0];

		// Стучимся к API
		const response = await fetch(`https://networkcalc.com/api/dns/whois/${cleanDomain}`);

		const data = await response.json();

		// Проверяем, что домен существует и у него есть регистратор
		if (data.status === 'OK' && data.whois && data.whois.registrar) {
			const w = data.whois;

			// Формируем красивый отчет
			const report = `✅ **WHOIS-Радар: Цель найдена!**\n\n` +
											`🌍 Домен: \`${cleanDomain}\`\n` +
											`🏢 Регистратор: ${w.registrar}\n` +
											`📅 Создан: ${new Date(w.creation_date).toLocaleDateString('ru-RU')}\n` +
											`💀 Истекает: ${new Date(w.updated_date).toLocaleDateString('ru-RU')}\n` +
											`👤 Владелец: ${w.registrant_name || 'Скрыт настройками приватности'}`;

			await bot.editMessageText(report, {
				chat_id: chatId,
				message_id: loadingMsg.message_id,
				parse_mode: "Markdown",
				reply_markup: backKeyboard
			});
		} else {
			bot.editMessageText(`❌ Ошибка: Домен свободен, введен с ошибкой или данные скрыты`, {
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

// --- МОДУЛЬ 5: КРИПТО-СЛЕДОПЫТ (BTC, ETH, TRON) ---
else if (userStates[chatId] === 'waiting_for_crypto') {
	delete userStates[chatId];

	const loadingMsg = await bot.sendMessage(chatId, `⏳ Сканирую блокчейн по кошельку: *${text}*...\n_Считаю транзакции..._`, { parse_mode: "Markdown"});

	try {
		const [BtcRes, EthRes, TronRes] = await Promise.all([
			fetch(`https://blockchain.info/rawaddr/${text}`),
			fetch(`https://api.blockcypher.com/v1/eth/main/addrs/${text}/balance`), // API для Ethereum
			fetch(`https://apilist.tronscanapi.com/api/accountv2?address=${text}`)  // API для TRON
		]);

		// Анализируем ответы. Если сервер ответил 200 ОК - кошелек валидный и в нем были движения
		// Сразу формируем красивые кликабельные ссылки на обозреватели!
		const BtcStatus = BtcRes.status === 200 ? `✅ [Активен (Смотреть)](https://www.blockchain.com/explorer/addresses/btc/${text})` : `❌ Не найден`;
		const EthStatus = EthRes.status === 200 ? `✅ [Активен (Смотреть)](https://etherscan.io/address/${text})` : `❌ Не найден`;
		const	 TronStatus = TronRes.status === 200 ? `✅ [Активен (Смотреть)](https://tronscan.org/#/address/${text})` : `❌ Не найден`;

		// Формируем финальный отчет
		const report = `✅ **Крипто-Следопыт: Отчет готов!**\n\n` +
													`🪙 Цель: \`${text}\`\n\n` +
													`🟠 Bitcoin (BTC): ${BtcStatus}\n` +
													`🔵 Ethereum (ETH): ${EthStatus}\n` +
													`🔴 TRON (TRX): ${TronStatus}`;

		// Обновляем сообщение
		await bot.editMessageText(report, {
			chat_id: chatId,
			message_id: loadingMsg.message_id,
			parse_mode: "Markdown",
			disable_web_page_preview: true, // Отключаем огромные картинки сайтов
			reply_markup: backKeyboard
		});												
	} catch (error) {
				bot.editMessageText(`⚠️ Ошибка связи с блокчейнами: ${error.message}`, {
					chat_id: chatId,
					message_id: loadingMsg.message_id,
					reply_markup: backKeyboard
				});
	}
}

// --- МОДУЛЬ 6: ЧЕКЕР УТЕЧЕК (DATA BREACH) ---
    else if (userStates[chatId] === 'waiting_for_email') {
		delete userStates[chatId]; 

		const loadingMsg = await bot.sendMessage(chatId, `⏳ Пробиваю почту: *${text}*...\n_Связываюсь с серверами Даркнета..._`, { parse_mode: "Markdown"});

		try {
			// Стучимся в открытое Api XposedOrNot + надеваем маску браузера!
			const response = await fetch(`https://api.xposedornot.com/v1/check-email/${text}`, {
				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
				}
			});

			if (response.status === 404) {
				const report = `✅ **Чекер утечек: Цель в безопасности!**\n\n` +
							   `📧 Почта: \`${text}\`\n\n` +
							   `Данных нет в открытых сливах. Отличная работа по кибергигиене! 🛡`;

				await bot.editMessageText(report, {
					chat_id: chatId,
					message_id: loadingMsg.message_id,
					parse_mode: "Markdown",
					reply_markup: backKeyboard
				});
				return;
			}

			if (response.status === 200) {
				const data = await response.json();
				
				// БРОНЕБОЙНАЯ ПРОВЕРКА V3: Абсолютная защита от кривых API
				// Проверяем, прислал ли сервер массив breaches
				if (data && Array.isArray(data.breaches)) {
                    // flat() выравнивает любые странные массивы в один понятный список
                    const flatBreaches = data.breaches.flat();

                    if (flatBreaches.length > 0) {
                        const topBreaches = flatBreaches.slice(0, 10).join(', ');
                        const moreCount = flatBreaches.length > 10 ? `\n_... и еще ${flatBreaches.length - 10} баз_` : '';

                        const report = `🚨 **ВНИМАНИЕ: Найдена утечка данных!**\n\n` +
                                       `📧 Почта: \`${text}\`\n`	+
                                       `💥 Количество сливов: ${flatBreaches.length}\n\n` +
                                       `🏴‍☠️ **Засветилась в базах:**\n${topBreaches}${moreCount}\n\n` +
                                       `💡 _Рекомендация: Срочно смените пароли на этих сервисах и поставьте 2FA!_`;

                        // МАГИЯ: Сохраняем данные в нашу оперативную память               
                        searchCache[chatId] = { email: text, breaches: flatBreaches };

                        // Формируем клавиатуру. Если баз > 10, добавляем кнопку развертывания
                        const keyboard = { inline_keyboard: [] };
                        if(flatBreaches.length > 10) {
                        		keyboard.inline_keyboard.push([{ text:`🔽 Показать всё (${flatBreaches.length})`, callback_data: "expand_breaches"}]);
                        }
                        keyboard.inline_keyboard.push([{ text:"🔙 Назад в меню", callback_data: "menu_main" }]);              

                        await bot.editMessageText(report, {
                            chat_id: chatId,
                            message_id: loadingMsg.message_id,
                            parse_mode: "Markdown",
                            reply_markup: keyboard
                        });
                        return; // Выходим
                    }
                }    
                
                // Если API ответил 200, но массива нет или он пустой (почта чистая)
                const report = `✅ **Чекер утечек: Цель в безопасности!**\n\n` +
                               `📧 Почта: \`${text}\`\n\n` +
                               `Данных нет в открытых сливах. Отличная работа по кибергигиене! 🛡`;

                await bot.editMessageText(report, {
                    chat_id: chatId,
                    message_id: loadingMsg.message_id,
                    parse_mode: "Markdown",
                    reply_markup: backKeyboard
                });
                
			} else {
                // Если сервер API временно лежит (код 500, 429 и т.д.)
				bot.editMessageText(`❌ Ошибка проверки. Сервер баз данных временно недоступен (Код: ${response.status}).`, {
					chat_id: chatId,
					message_id: loadingMsg.message_id,
					reply_markup: backKeyboard
				});
			}	
		} catch (error) {
			bot.editMessageText(`⚠️ Ошибка связи с серверами: ${error.message}`, {
				chat_id: chatId,
				message_id: loadingMsg.message_id,
				reply_markup: backKeyboard
			});
		}
	}

// --- МОДУЛЬ 7: ФОТО-КРИМИНАЛИСТ (EXIF) ---
	else if (userStates[chatId] === 'waiting_for_photo') {
		
		// 1. проверяем прислал ли юзер именно файлом фотографию
		if (!msg.document) {
			return bot.sendMessage(chatId, "⚠️ Ты прислал сжатое фото или текст! \n\nПришли картинку именно как **файл** (документ) 📎", { parse_mode: "Markdown"});
		}

		// 2. берем IDф айла и кидаем сообщение загрузки
		const fileId = msg.document.file_id;
		const loadingMsg = await bot.sendMessage(chatId, "🔍 Скачиваю файл и ищу скрытые метаданные...");

		try {
				// 3. получаем прямую ссылку на скачивание файла от серверов тг
				const fileLink = await bot.getFileLink(fileId);

				// 4. Магия библеотеки exifr! Она умеет читать прямо по ссылке
				const exifData = await exifr.parse(fileLink);

				// Если метаданных вообще нет (например картинка скачана с вк)
				if (!exifData) {
					return bot.editMessageText("❌ Никаких скрытых данных (EXIF) не найдено. Возможно, они были удалены или картинска скачана из соцсети.", {
						chat_id: chatId,
						message_id: loadingMsg.message_id,
						reply_markup: backKeyboard
					});
				}

				// 5. собираем отчет
				let report = "📸 **ФОТО-КРИМИНАЛИСТ (EXIF)**\n\n";

				// Производитель и модель устройства
				if (exifData.Make || exifData.Model) {
					report += `📱 **Устройство:** ${exifData.Make || 'Неизвестно'} ${exifData.Model || ''}\n`;
				}

				// Оригинальная дата съемки
				if (exifData.DateTimeOriginal) {
					const date = new Date(exifData.DateTimeOriginal).toLocaleString('ru-RU');
					report += `📅 **Дата съемки:** ${date}\n`;
				}

				// Программа в которой редактировали
				if (exifData.Software) {
					report += `💻 **Софт:** ${exifData.Software}\n`;
				}

				// Геолокация
				if (exifData.latitude && exifData.longitude) {
					report += `\n🌍 **Геолокация:**\n`;
					report += `📍 Широта: \`${exifData.latitude}\`\n`;
					report += `📍 Долгота: \`${exifData.longitude}\`\n`;
					report += `🗺 [Открыть в Google Maps](https://www.google.com/maps?q=${exifData.latitude},${exifData.longitude})\n`;
				} else {
					report += `\n🌍 **Геолокация:** Координаты не найдены (GPS был выключен при съемке).\n`;
				}

		// Отправляем результат и обновляем меню
		bot.editMessageText(report, {
			chat_id: chatId,
			message_id: loadingMsg.message_id,
			parse_mode: "Markdown",
			disable_web_page_preview: true, // чтобы гугл карты не давали огромное превью
			reply_markup: backKeyboard
		});

		// Очищаем состояние как мы закончили
		delete userStates[chatId];
	} catch (error) {
		console.error("Ошибка в модуле EXIF:", error);
		bot.editMessageText("⚠️ Ошибка при анализе фото. Возможно, формат не поддерживается библиотекой.", {
			chat_id: chatId,
			message_id: loadingMsg.message_id,
			reply_markup: backKeyboard
		});
		// Очищаем стейт
		delete userStates[chatId];
	}
}

}); // Закрывает весь блок с функционалом

// Отлавливаем скрытые ошибки Телеграма, чтобы они не ломали сервер
bot.on('polling_error', (error) => {
	console.log("⚠️ Внутренняя ошибка Телеграма:", error.message);
});

// --- АБСОЛЮТНЫЙ ГЛУШИТЕЛЬ ОШИБОК ---
// Перехватываем все сетевые обрывы, чтобы Node.js не выплевывал кишки (TLSWrap) в лог
process.on('unhandledRejection', (reason, promise) => {
    console.log("🛡 Заблокирована системная ошибка сети (игнорируем):", reason.message || "Неизвестный сбой");
});