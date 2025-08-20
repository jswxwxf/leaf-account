/**
 * @file calculator.js
 * @description 使用调度场算法（Shunting-yard algorithm）安全地解析和计算数学表达式。
 * 它支持括号和标准的运算符优先级（先乘除后加减）。
 */

/**
 * 定义运算符的优先级。
 * 数字越大，优先级越高。乘除的优先级高于加减。
 * @type {Object<string, number>}
 */
const precedence = {
  '+': 1,
  '-': 1,
  '*': 2,
  '/': 2,
}

/**
 * [核心步骤1] 将中缀表达式转换为后缀表达式（逆波兰表达式 RPN）。
 * 这是调度场算法的核心。它使用一个输出队列和一个操作符栈。
 * @param {string} expression - 用户输入的中缀数学表达式字符串, e.g., "3 + 4 * 2".
 * @returns {Array<string|number>} - 后缀表达式的 token 数组, e.g., [3, 4, 2, '*', '+'].
 */
export function toRPN(expression) {
  const outputQueue = [] // 输出队列，最终成为RPN结果
  const operatorStack = [] // 运算符栈

  // 正则表达式将表达式字符串分割成数字和运算符的 token 数组。
  // 例如 "3+4*2" -> ["3", "+", "4", "*", "2"]
  // 支持小数和负数。
  const tokens = expression.match(/-?\d+\.?\d*|[+\-*/()]/g)

  if (!tokens) return [] // 如果无法解析，返回空数组

  tokens.forEach((token) => {
    // 检查 token 是否是一个数字
    if (!isNaN(parseFloat(token))) {
      // 规则1: 如果是数字，直接放入输出队列。
      outputQueue.push(parseFloat(token))
    } else if (token in precedence) {
      // 规则2: 如果是运算符 (e.g., +, *, /)
      // 当操作符栈不为空，且栈顶不是左括号，并且栈顶运算符的优先级 >= 当前运算符的优先级时
      // 就将栈顶的运算符弹出并放入输出队列。
      // 这个循环确保了高优先级的运算符（如*）会先于低优先级的（如+）被处理。
      while (
        operatorStack.length &&
        operatorStack[operatorStack.length - 1] !== '(' &&
        precedence[operatorStack[operatorStack.length - 1]] >= precedence[token]
      ) {
        outputQueue.push(operatorStack.pop())
      }
      // 当前运算符入栈。
      operatorStack.push(token)
    } else if (token === '(') {
      // 规则3: 如果是左括号，直接入栈。
      operatorStack.push(token)
    } else if (token === ')') {
      // 规则4: 如果是右括号，将运算符从栈中弹出并放入输出队列，直到遇到左括号。
      while (operatorStack.length && operatorStack[operatorStack.length - 1] !== '(') {
        outputQueue.push(operatorStack.pop())
      }
      // 弹出左括号，但不放入输出队列（括号仅用于分组，不参与计算）。
      operatorStack.pop()
    }
  })

  // 规则5: 遍历完所有 token 后，将栈中剩余的所有运算符依次弹出并放入输出队列。
  while (operatorStack.length) {
    outputQueue.push(operatorStack.pop())
  }

  return outputQueue
}

/**
 * [核心步骤2] 计算后缀表达式（RPN）的值。
 * 这个过程非常简单：从左到右读取 RPN 队列，遇到数字就压入一个栈，遇到运算符就从栈中弹出两个数字进行计算，然后把结果再压入栈。
 * @param {Array<string|number>} rpnTokens - toRPN 函数生成的 RPN token 数组。
 * @returns {number} - 最终的计算结果。
 */
export function calculateRPN(rpnTokens) {
  const stack = [] // 用于计算的栈

  rpnTokens.forEach((token) => {
    // 如果是数字，压入栈。
    if (typeof token === 'number') {
      stack.push(token)
    } else if (token in precedence) {
      // 如果是运算符，从栈顶弹出两个数字。
      // 注意顺序：b 是第二个操作数，a 是第一个。
      const b = stack.pop()
      const a = stack.pop()

      // 执行相应的计算，并将结果压回栈中。
      switch (token) {
        case '+':
          stack.push(a + b)
          break
        case '-':
          stack.push(a - b)
          break
        case '*':
          stack.push(a * b)
          break
        case '/':
          if (b === 0) throw new Error('Division by zero.') // 处理除以零的边界情况
          stack.push(a / b)
          break
      }
    }
  })

  // 当所有 token 处理完毕后，栈中应该只剩下一个数字，即最终结果。
  return stack[0]
}
