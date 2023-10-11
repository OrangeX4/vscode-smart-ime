import { commands, extensions, ExtensionContext } from 'vscode';

// 执行命令
export async function execSwitchCommand() {
  const extName = 'beishanyufu.ime-and-cursor';
  const command = 'ime-and-cursor.switch';
  try {
    await commands.executeCommand(command);
  } catch (err) {
    // 如果失败了, 则走更复杂的错误处理流程
    const imeAndCursorExt = extensions.getExtension(extName);
    if (!imeAndCursorExt) {
      console.log('请首先完成 IME and Cursor 插件的安装与相应配置');
      return;
    }
    // 没有激活则激活插件
    if (!imeAndCursorExt.isActive) {
      await imeAndCursorExt.activate();
    }
    commands.executeCommand(command);
  }
}

export function activate(context: ExtensionContext) {
  // Open a typst local package
  context.subscriptions.push(commands.registerCommand('smart-ime.helloWorld', async () => {
    await execSwitchCommand();
  }));
}
