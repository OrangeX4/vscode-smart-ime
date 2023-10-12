import {
  // type
  Position,
  Range,
  TextDocument,
  ExtensionContext,
  // var
  window,
  commands,
  extensions,
  workspace,
} from 'vscode';
import { HScopesAPI } from '../types/hscopes';

const chineseAndSpaceSwitchPattern = /^[\u4e00-\u9fa5] $/;
const englishAndDoubleSpaceSwitchPattern = /^[^\u4e00-\u9fa5]  $/;

// config
const config = {
  // 节流时间
  throttleTime: 2000,
  enableChineseAndSpaceSwitch: false,
  enableEnglishAndDoubleSpaceSwitch: false,
  enterScopesSwitch: [] as string[],
  leaveScopesSwitch: [] as string[],
};

// 用于 scope 判断
const hscopes = extensions.getExtension('draivin.hscopes');
let lastScopes = [] as string[];

// 读取配置并更新
export function updateConfig() {
  function parse(arrStr: string) {
    return arrStr.split(',').map((str) => str.trim()).filter((str) => str !== '');
  }
  const workspaceConfig = workspace.getConfiguration();
  config.throttleTime = +(workspaceConfig.get('smart-ime.throttleTime') as number);
  config.enableChineseAndSpaceSwitch = !!workspaceConfig.get('smart-ime.enableChineseAndSpaceSwitch');
  config.enableEnglishAndDoubleSpaceSwitch = !!workspaceConfig.get('smart-ime.enableEnglishAndDoubleSpaceSwitch');
  config.leaveScopesSwitch = parse(workspaceConfig.get('smart-ime.leaveScopesSwitch') as string);
  config.enterScopesSwitch = parse(workspaceConfig.get('smart-ime.enterScopesSwitch') as string);
}

// 执行命令
let lastExecTime = 0;
export async function execSwitchCommand() {
  // 加上节流处理
  const now = Date.now();
  if (now - lastExecTime < config.throttleTime) {
    return;
  }
  console.log('execSwitchCommand');
  lastExecTime = now;
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

// 中文+空格切换输入法
export async function chineseAndSpaceSwitch(document: TextDocument, cursorPosition: Position) {
  if (cursorPosition.character < 2) {
    return;
  }
  const prePosition = cursorPosition.translate(0, -2);
  const range = new Range(prePosition, cursorPosition);
  const preChars = document.getText(range);
  if (chineseAndSpaceSwitchPattern.test(preChars)) {
    await execSwitchCommand();
  }
}

// 当前行有中文且前面是非中文+双空格时切换输入法并删掉一个空格
export async function englishAndDoubleSpaceSwitch(document: TextDocument, cursorPosition: Position) {
  if (cursorPosition.character < 4) {
    return;
  }
  const line = document.lineAt(cursorPosition.line);
  const lineText = line.text;
  // 如果当前行没有中文, 则不处理
  if (!/[\u4e00-\u9fa5]/.test(lineText)) {
    return;
  }
  // 非中文+双空格
  const prePosition = cursorPosition.translate(0, -3);
  const range = new Range(prePosition, cursorPosition);
  const preChars = document.getText(range);
  if (englishAndDoubleSpaceSwitchPattern.test(preChars)) {
    // 删掉最后一个字符
    const deleteRange = new Range(cursorPosition.translate(0, -1), cursorPosition);
    await window.activeTextEditor?.edit((editBuilder) => {
      editBuilder.delete(deleteRange);
      execSwitchCommand();
    });
  }
}

// 处理 scopes 变化事件
export async function handleScopesChange(curScopes: string[]) {
  // 根据 leaveScopes 判断是否需要切换输入法
  if (config.leaveScopesSwitch.length !== 0) {
    // 找到离开的 scopes, 即 curScopes 中没有的 lastScopes
    const leaveScopes = lastScopes.filter((scope) => !curScopes.includes(scope));
    for (const prefix of config.leaveScopesSwitch) {
      // 前缀匹配
      if (leaveScopes.some((scope) => scope.startsWith(prefix))) {
        execSwitchCommand();
        lastScopes = curScopes;
        return;
      }
    }
  }
  // 根据 enterScopes 判断是否需要切换输入法
  if (config.enterScopesSwitch.length !== 0) {
    // 找到进入的 scopes, 即 lastScopes 中没有的 curScopes
    const enterScopes = curScopes.filter((scope) => !lastScopes.includes(scope));
    for (const prefix of config.enterScopesSwitch) {
      // 前缀匹配
      if (enterScopes.some((scope) => scope.startsWith(prefix))) {
        execSwitchCommand();
        lastScopes = curScopes;
        return;
      }
    }
  }
  // 更新 lastScopes
  lastScopes = curScopes;
}

export function activate(context: ExtensionContext) {
  // 激活 hscopes
  hscopes?.activate();

  // 读取配置
  updateConfig();

  // 监听 vscode 光标变化事件
  window.onDidChangeTextEditorSelection((e) => {
    // 如果是选中了非空白字符, 则不处理
    if (!e.selections[0].isEmpty) {
      return;
    }
    // 如果前两个字符是中文加空格, 则切换输入法
    const editor = window.activeTextEditor;
    if (!editor) {
      return;
    }
    const document = editor.document;
    const position = e.selections[0].active;
    if (config.enableChineseAndSpaceSwitch) {
      chineseAndSpaceSwitch(document, position);
    }
    if (config.enableEnglishAndDoubleSpaceSwitch) {
      englishAndDoubleSpaceSwitch(document, position);
    }
    // 获取当前位置的 textmate scopes
    if (!hscopes) {
      return;
    }
    const token = (hscopes!.exports as HScopesAPI).getScopeAt(document, position);
    if (!token) {
      return;
    }
    handleScopesChange(token.scopes);
  });
}
