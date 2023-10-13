# Smart IME

类似于 idea 的 Smart Input，用于智能地进行中英输入法的切换，依赖于 IME and Cursor 插件，所以请先进行该插件的配置。

## 依赖

需要安装 IME and Cursor 与 HyperScopes 插件。

## 特性

- 在中文后输入一个空格自动切换到英文输入法（默认开启），在英文后输入两个空格自动切换到中文输入法（默认未开启）；
- 进入到注释场景时，自动切换为中文输入法，离开时自动切换为英文输入法；

## 插件设置

- `smart-ime.enableChineseAndSpaceSwitchToEnglish`: 检测到中文+空格时切换输入法到英文，默认开启
- `smart-ime.enableEnglishAndDoubleSpaceSwitchToChinese`: 检测到当前行前有中文，且光标前面是非中文+双空格时切换输入法到中文并删掉一个空格，默认关闭
- `smart-ime.enterScopesSwitchToChinese`: 进入某些 scopes 时切换输入法到中文，用逗号分割，前缀匹配 (请使用 `Developer: Inspect Editor Tokens and Scopes` 查看)
  - 例如这里默认配置了 `comment` 就可以实现进入注释块时切换到中文输入法的效果
- `smart-ime.enterScopesSwitchToEnglish`: 进入某些 scopes 时切换输入法到英文，用逗号分割，前缀匹配 (请使用 `Developer: Inspect Editor Tokens and Scopes` 查看)
- `smart-ime.leaveScopesSwitchToChinese`: 离开某些 scopes 时切换输入法到中文，用逗号分割，前缀匹配 (请使用 `Developer: Inspect Editor Tokens and Scopes` 查看)
- `smart-ime.leaveScopesSwitchToEnglish`: 离开某些 scopes 时切换输入法到中文，用逗号分割，前缀匹配 (请使用 `Developer: Inspect Editor Tokens and Scopes` 查看)
  - 例如这里默认配置了 `comment` 就可以实现离开注释块时切换到英文输入法的效果
