# Smart IME

类似于 idea 的 Smart Input 用于智能地进行中英输入法的切换，依赖于 IME and Cursor 插件，请先进行该插件的配置。

## 依赖

需要安装 IME and Cursor 与 HyperScopes 插件。

## 插件设置

* `smart-ime.throttleTime`: 设置一段时间只会触发一次切换
* `smart-ime.enableChineseAndSpaceSwitch`: 检测到中文+空格时切换输入法
* `smart-ime.enableEnglishAndDoubleSpaceSwitch`: 检测到当前行有中文且前面是非中文+双空格时切换输入法并删掉一个空格
* `smart-ime.enterScopesSwitch`: 进入某些 scopes 时切换输入法，用逗号分割，前缀匹配 (请使用 `Developer: Inspect Editor Tokens and Scopes` 查看)
* `smart-ime.leaveScopesSwitch`: 离开某些 scopes 时切换输入法，用逗号分割，前缀匹配 (请使用 `Developer: Inspect Editor Tokens and Scopes` 查看)
