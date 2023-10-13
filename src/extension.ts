import {
  // type
  Position,
  Range,
  TextDocument,
  ExtensionContext,
  // var
  window,
  extensions,
  workspace,
} from 'vscode';
import { HScopesAPI } from '../types/hscopes';

const chineseAndSpaceSwitchPattern = /^[^\x00-\xff] $/;
const englishAndDoubleSpaceSwitchPattern = /^[\x00-\xff]  $/;

// config
const config = {
  enableChineseAndSpaceSwitchToEnglish: false,
  enableEnglishAndDoubleSpaceSwitchToChinese: false,
  enterScopesSwitchToChinese: [] as string[],
  enterScopesSwitchToEnglish: [] as string[],
  leaveScopesSwitchToChinese: [] as string[],
  leaveScopesSwitchToEnglish: [] as string[],
};

// ime api
const imeApi = extensions.getExtension('beishanyufu.ime-and-cursor')?.exports as {
  getChineseIM: () => string
  getEnglishIM: () => string
  obtainIM: () => string
  switchToChineseIM: () => void
  switchToEnglishIM: () => void
  switch: () => void
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
  config.enableChineseAndSpaceSwitchToEnglish = !!workspaceConfig.get('smart-ime.enableChineseAndSpaceSwitchToEnglish');
  config.enableEnglishAndDoubleSpaceSwitchToChinese = !!workspaceConfig.get('smart-ime.enableEnglishAndDoubleSpaceSwitchToChinese');
  config.enterScopesSwitchToChinese = parse(workspaceConfig.get('smart-ime.enterScopesSwitchToChinese') as string);
  config.enterScopesSwitchToEnglish = parse(workspaceConfig.get('smart-ime.enterScopesSwitchToEnglish') as string);
  config.leaveScopesSwitchToChinese = parse(workspaceConfig.get('smart-ime.leaveScopesSwitchToChinese') as string);
  config.leaveScopesSwitchToEnglish = parse(workspaceConfig.get('smart-ime.leaveScopesSwitchToEnglish') as string);
}

// switch to chinese im
export async function switchToChineseIM() {
  if (await imeApi.obtainIM() !== imeApi.getChineseIM()) {
    await imeApi.switchToChineseIM();
  }
}

// switch to english im
export async function switchToEnglishIM() {
  if (await imeApi.obtainIM() !== imeApi.getEnglishIM()) {
    await imeApi.switchToEnglishIM();
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
    await switchToEnglishIM();
  }
}

// 当前行有中文且前面是非中文+双空格时切换输入法并删掉一个空格
export async function englishAndDoubleSpaceSwitch(document: TextDocument, cursorPosition: Position) {
  if (cursorPosition.character < 4) {
    return;
  }
  // 获取当前行光标之前的内容
  const lineText = document.getText(new Range(cursorPosition.line, 0, cursorPosition.line, cursorPosition.character));
  // 如果当前行没有中文, 则不处理
  if (!/[\u4e00-\u9fa5]/.test(lineText)) {
    return;
  }
  // 非中文+双空格
  const prePosition = cursorPosition.translate(0, -3);
  const range = new Range(prePosition, cursorPosition);
  const preChars = document.getText(range);
  if (englishAndDoubleSpaceSwitchPattern.test(preChars)) { 
    // 如果当前是英文删掉最后一个字符然后切换到中文输入法
    if (await imeApi.obtainIM() === imeApi.getEnglishIM()) {
      const deleteRange = new Range(cursorPosition.translate(0, -1), cursorPosition);
      await window.activeTextEditor?.edit((editBuilder) => {
        editBuilder.delete(deleteRange);
        imeApi.switchToChineseIM();
      });
    }
  }
}

// 处理 scopes 变化事件
export async function handleScopesChange(curScopes: string[]) {
  const isCurrentChinese = await imeApi.obtainIM() === imeApi.getChineseIM();
  const switchFn = isCurrentChinese ? imeApi.switchToEnglishIM : imeApi.switchToChineseIM;
  const leaveScopesSwitch = isCurrentChinese ? config.leaveScopesSwitchToEnglish : config.leaveScopesSwitchToChinese;
  // 根据 leaveScopes 判断是否需要切换输入法
  if (leaveScopesSwitch.length !== 0) {
    // 找到离开的 scopes, 即 curScopes 中没有的 lastScopes
    const leaveScopes = lastScopes.filter((scope) => !curScopes.includes(scope));
    for (const prefix of leaveScopesSwitch) {
      // 前缀匹配
      if (leaveScopes.some((scope) => scope.startsWith(prefix))) {
        await switchFn();
        lastScopes = curScopes;
        return;
      }
    }
  }
  const enterScopesSwitch = isCurrentChinese ? config.enterScopesSwitchToEnglish : config.enterScopesSwitchToChinese;
  // 根据 enterScopes 判断是否需要切换输入法
  if (enterScopesSwitch.length !== 0) {
    // 找到进入的 scopes, 即 lastScopes 中没有的 curScopes
    const enterScopes = curScopes.filter((scope) => !lastScopes.includes(scope));
    for (const prefix of enterScopesSwitch) {
      // 前缀匹配
      if (enterScopes.some((scope) => scope.startsWith(prefix))) {
        await switchFn();
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
    const editor = window.activeTextEditor;
    if (!editor) {
      return;
    }
    const document = editor.document;
    const position = e.selections[0].active;
    // 如果前两个字符是中文加空格, 则切换输入法
    if (config.enableChineseAndSpaceSwitchToEnglish) {
      chineseAndSpaceSwitch(document, position);
    }
    // 英文加双空格, 则切换输入法
    if (config.enableEnglishAndDoubleSpaceSwitchToChinese) {
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
