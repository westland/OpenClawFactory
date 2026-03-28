"""
Telegram bot — text your agents from your phone.
Usage:
  /assign Henry Research the latest news on open-source LLMs
  /status
  /tasks
"""
import logging

logger = logging.getLogger(__name__)


async def start_telegram_bot(config, agent_manager):
    if not config.telegram_bot_token:
        logger.info("No TELEGRAM_BOT_TOKEN set — Telegram bot disabled.")
        return

    try:
        from telegram import Update
        from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, filters

        app = ApplicationBuilder().token(config.telegram_bot_token).build()

        async def cmd_start(update: Update, ctx):
            await update.message.reply_text(
                "👋 OpenClawFactory online.\n\n"
                "Commands:\n"
                "/assign [Agent] [task description]\n"
                "/status — show all agent stages\n"
                "/tasks — list recent tasks\n\n"
                "Or just send a message to auto-assign."
            )

        async def cmd_status(update: Update, ctx):
            agents = agent_manager.get_agents()
            lines = [f"*{a['name']}* ({a['role']}) — `{a['stage']}`" for a in agents]
            await update.message.reply_text("\n".join(lines), parse_mode="Markdown")

        async def cmd_tasks(update: Update, ctx):
            from core.state import state
            tasks = state.get_tasks(10)
            if not tasks:
                await update.message.reply_text("No tasks yet.")
                return
            lines = [
                f"[{t['status'].upper()}] *{t['title'][:50]}* → {t['agent_name']}"
                for t in tasks
            ]
            await update.message.reply_text("\n".join(lines), parse_mode="Markdown")

        async def cmd_assign(update: Update, ctx):
            args = ctx.args
            if not args:
                await update.message.reply_text("Usage: /assign [AgentName] task description")
                return

            from core.state import state as st
            agents = {a["name"].lower() for a in st.get_agents()}
            if args[0].lower() in agents:
                agent_name = args[0]
                task = " ".join(args[1:])
            else:
                agent_name = ""
                task = " ".join(args)

            try:
                result = agent_manager.assign_task(task, agent_name=agent_name)
                await update.message.reply_text(
                    f"✅ Task assigned to *{result['agent']}*\nID: `{result['task_id']}`",
                    parse_mode="Markdown"
                )
            except Exception as e:
                await update.message.reply_text(f"❌ {e}")

        async def handle_message(update: Update, ctx):
            task = update.message.text
            try:
                result = agent_manager.assign_task(task)
                await update.message.reply_text(
                    f"✅ Assigned to *{result['agent']}*\nTracking: `{result['task_id']}`",
                    parse_mode="Markdown"
                )
            except Exception as e:
                await update.message.reply_text(f"❌ {e}")

        app.add_handler(CommandHandler("start", cmd_start))
        app.add_handler(CommandHandler("status", cmd_status))
        app.add_handler(CommandHandler("tasks", cmd_tasks))
        app.add_handler(CommandHandler("assign", cmd_assign))
        app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

        logger.info("Telegram bot starting...")
        # run_polling() installs signal handlers which fail in non-main threads.
        # Use the lower-level API instead.
        await app.initialize()
        await app.start()
        await app.updater.start_polling()
        logger.info("Telegram bot polling.")
        # Keep the coroutine alive until the event loop stops.
        import asyncio
        await asyncio.Event().wait()

    except ImportError:
        logger.warning("python-telegram-bot not installed — Telegram bot disabled.")
    except Exception as exc:
        logger.error(f"Telegram bot error: {exc}", exc_info=True)
