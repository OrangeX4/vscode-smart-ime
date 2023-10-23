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
  TextEditorCursorStyle,
} from 'vscode';
import { HScopesAPI } from '../types/hscopes';

const chineseCharacterPattern = /[^\x00-\xff]/;
const chineseAndSpaceSwitchToEnglishPattern = /^[^\x00-\xff] $/;
const englishAndDoubleSpaceSwitchToChinesePattern = /^[\x00-\xff]  $/;

// 全局的禁用标记
let disabledFlag = false;
// 关于 vim 的禁用逻辑
let lastDisabledFlag = false;
let lastCursorStyle: TextEditorCursorStyle | undefined;

// config
const config = {
  warnDisabled: true,
  disabledOnEnglishTextOverN: 100,
  enableChineseSwitchToChinese: true,
  enableChineseSwitchToChineseInterval: 2000,
  enableChineseAndSpaceSwitchToEnglish: true,
  enableEnglishAndDoubleSpaceSwitchToChinese: false,
  enterScopesSwitchToChinese: [] as string[],
  enterScopesSwitchToEnglish: [] as string[],
  leaveScopesSwitchToChinese: [] as string[],
  leaveScopesSwitchToEnglish: [] as string[],
  disabledOnVim: true,
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

// 读取配置并更新
export function updateConfig() {
  function parse(arrStr: string) {
    return arrStr.split(',').map((str) => str.trim()).filter((str) => str !== '');
  }
  const workspaceConfig = workspace.getConfiguration();
  config.warnDisabled = !!(workspaceConfig.get('smart-ime.warnDisabled') as boolean);
  config.disabledOnEnglishTextOverN = +(workspaceConfig.get('smart-ime.disabledOnEnglishTextOverN') as number);
  config.enableChineseSwitchToChinese = !!workspaceConfig.get('smart-ime.enableChineseSwitchToChinese');
  config.enableChineseSwitchToChineseInterval = +(workspaceConfig.get('smart-ime.enableChineseSwitchToChineseInterval') as number);
  config.enableChineseAndSpaceSwitchToEnglish = !!workspaceConfig.get('smart-ime.enableChineseAndSpaceSwitchToEnglish');
  config.enableEnglishAndDoubleSpaceSwitchToChinese = !!workspaceConfig.get('smart-ime.enableEnglishAndDoubleSpaceSwitchToChinese');
  config.enterScopesSwitchToChinese = parse(workspaceConfig.get('smart-ime.enterScopesSwitchToChinese') as string);
  config.enterScopesSwitchToEnglish = parse(workspaceConfig.get('smart-ime.enterScopesSwitchToEnglish') as string);
  config.leaveScopesSwitchToChinese = parse(workspaceConfig.get('smart-ime.leaveScopesSwitchToChinese') as string);
  config.leaveScopesSwitchToEnglish = parse(workspaceConfig.get('smart-ime.leaveScopesSwitchToEnglish') as string);
  config.disabledOnVim = !!workspaceConfig.get('smart-ime.disabledOnVim');
}

let lastChineseSwitchToChineseTime = 0;
// switch to chinese im
export async function switchToChineseIM() {
  if (await imeApi.obtainIM() !== imeApi.getChineseIM()) {
    await imeApi.switchToChineseIM();
  }
}

// switch to english im
export async function switchToEnglishIM() {
  if (await imeApi.obtainIM() !== imeApi.getEnglishIM()) {
    // 切换到英文输入法时顺便重置一下 lastChineseSwitchToChineseTime
    lastChineseSwitchToChineseTime = 0;
    await imeApi.switchToEnglishIM();
  }
}


// 中文切换输入法
export async function chineseSwitchToChinese(document: TextDocument, cursorPosition: Position) {
  if (cursorPosition.character < 1) {
    return;
  }

  const prePosition = cursorPosition.translate(0, -1);
  const range = new Range(prePosition, cursorPosition);
  const preChars = document.getText(range);
  if (chineseCharacterPattern.test(preChars)) {
    // 设置触发间隔
    if (Date.now() - lastChineseSwitchToChineseTime < config.enableChineseSwitchToChineseInterval) {
      return;
    }
    lastChineseSwitchToChineseTime = Date.now();

    await switchToChineseIM();
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
  if (chineseAndSpaceSwitchToEnglishPattern.test(preChars)) {
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
  if (englishAndDoubleSpaceSwitchToChinesePattern.test(preChars)) {
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
let leaveScopesSwitchToChineseMatchs = {} as Record<string, boolean>;
let leaveScopesSwitchToEnglishMatchs = {} as Record<string, boolean>;
let enterScopesSwitchToChineseMatchs = {} as Record<string, boolean>;
let enterScopesSwitchToEnglishMatchs = {} as Record<string, boolean>;
export async function handleScopesChange(curScopes: string[]) {
  // 是否切换到中文的标记
  let isSwitch = false;
  let isSwitchToChinese = false;
  function getMatchs(scopesSwitch: string[]): Record<string, boolean> {
    const matchs = {} as Record<string, boolean>;
    for (const scopePrefix of scopesSwitch) {
      // 前缀匹配
      matchs[scopePrefix] = curScopes.some((scope) => scope.startsWith(scopePrefix));
    }
    return matchs;
  }
  // 判断是否在离开的 scope 中
  let newLeaveScopesSwitchToChineseMatchs = getMatchs(config.leaveScopesSwitchToChinese);
  if (config.leaveScopesSwitchToChinese.some(scopePrefix => leaveScopesSwitchToChineseMatchs[scopePrefix] && !newLeaveScopesSwitchToChineseMatchs[scopePrefix])) {
    isSwitch = true;
    isSwitchToChinese = true;
  }
  leaveScopesSwitchToChineseMatchs = newLeaveScopesSwitchToChineseMatchs;
  let newLeaveScopesSwitchToEnglishMatchs = getMatchs(config.leaveScopesSwitchToEnglish);
  if (config.leaveScopesSwitchToEnglish.some(scopePrefix => leaveScopesSwitchToEnglishMatchs[scopePrefix] && !newLeaveScopesSwitchToEnglishMatchs[scopePrefix])) {
    isSwitch = true;
    isSwitchToChinese = false;
  }
  leaveScopesSwitchToEnglishMatchs = newLeaveScopesSwitchToEnglishMatchs;
  // 判断是否在进入的 scope 中
  let newEnterScopesSwitchToChineseMatchs = getMatchs(config.enterScopesSwitchToChinese);
  if (config.enterScopesSwitchToChinese.some(scopePrefix => !enterScopesSwitchToChineseMatchs[scopePrefix] && newEnterScopesSwitchToChineseMatchs[scopePrefix])) {
    isSwitch = true;
    isSwitchToChinese = true;
  }
  enterScopesSwitchToChineseMatchs = newEnterScopesSwitchToChineseMatchs;
  let newEnterScopesSwitchToEnglishMatchs = getMatchs(config.enterScopesSwitchToEnglish);
  if (config.enterScopesSwitchToEnglish.some(scopePrefix => !enterScopesSwitchToEnglishMatchs[scopePrefix] && newEnterScopesSwitchToEnglishMatchs[scopePrefix])) {
    isSwitch = true;
    isSwitchToChinese = false;
  }
  enterScopesSwitchToEnglishMatchs = newEnterScopesSwitchToEnglishMatchs;
  if (isSwitch) {
    if (isSwitchToChinese) {
      await switchToChineseIM();
    } else {
      await switchToEnglishIM();
    }
  }
}

export function activate(context: ExtensionContext) {
  // 激活 hscopes
  hscopes?.activate();

  // 读取配置
  updateConfig();

  // 监听当前 editor 变化事件
  window.onDidChangeActiveTextEditor((editor) => {
    if (!editor) {
      return;
    }
    // 读取配置
    updateConfig();

    const document = editor.document;
    const lineCount = document.lineCount;
    // 判断当前文本内容是否有 DISABLE_SMART_IME
    // 一行一行地读取文本
    for (let i = 0; i < lineCount; i++) {
      const lineText = document.lineAt(i).text;
      if (lineText.includes('DISABLE_SMART_IME')) {
        disabledFlag = true;
        // 提示禁用
        if (config.warnDisabled) {
          window.showInformationMessage('当前文档存在 DISABLE_SMART_IME 字符串，Smart IME 已禁用（可在设置中关闭提示）');
        }
        return;
      }
    }
    if (config.disabledOnEnglishTextOverN > 0) {
      // 一行一行地读取文本
      let count = 0;
      let hasChinese = false;
      for (let i = 0; i < lineCount; i++) {
        // 检测当前行是否有中文
        const lineText = document.lineAt(i).text;
        if (!hasChinese && chineseCharacterPattern.test(lineText)) {
          hasChinese = true;
          break;
        }
        count += lineText.length;
      }
      // 如果没有中文且字符数超过阈值, 则禁用
      if (!hasChinese && count > config.disabledOnEnglishTextOverN) {
        disabledFlag = true;
        // 提示禁用
        if (config.warnDisabled) {
          window.showInformationMessage(`当前纯英文文档字符数超过 ${config.disabledOnEnglishTextOverN}，Smart IME 已禁用，加入中文字符后重新打开文档即可启用（可在设置中关闭提示）`);
        }
        return;
      }
    }
    disabledFlag = false;
  });

  window.onDidChangeTextEditorOptions(async (e) => {
    if (config.disabledOnVim) {
      if (lastCursorStyle !== e.options.cursorStyle) {
        if (e.options.cursorStyle === 2) {
          lastDisabledFlag = disabledFlag;
          disabledFlag = true;
        } else {
          disabledFlag = lastDisabledFlag;
        }
        lastCursorStyle = e.options.cursorStyle;
      }
    }
  });

  // 监听 vscode 光标变化事件
  window.onDidChangeTextEditorSelection((e) => {
    if (disabledFlag) {
      return;
    }
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
    // 如果前一个字符是中文, 则切换输入法
    if (config.enableChineseSwitchToChinese) {
      chineseSwitchToChinese(document, position);
    }
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
