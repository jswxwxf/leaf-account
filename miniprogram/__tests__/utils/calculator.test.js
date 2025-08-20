import { describe, it, expect } from 'vitest'
import { toRPN, calculateRPN } from '../../utils/calculator.js'
import { parseMoney } from '../../utils/index.js'

describe('Calculator Logic', () => {
  // --- Unit Tests for toRPN (Infix to RPN conversion) ---
  describe('toRPN', () => {
    it('should handle simple addition', () => {
      expect(toRPN('3+4')).toEqual([3, 4, '+'])
    })

    it('should handle simple subtraction', () => {
      expect(toRPN('10-5')).toEqual([10, 5, '-'])
    })

    it('should respect operator precedence', () => {
      expect(toRPN('3+4*2')).toEqual([3, 4, 2, '*', '+'])
    })

    it('should handle multiplication with × symbol', () => {
      expect(toRPN('3×4')).toEqual([3, 4, '×'])
    })

    it('should handle parentheses correctly', () => {
      expect(toRPN('(3+4)*2')).toEqual([3, 4, '+', 2, '*'])
    })

    it('should handle complex expressions', () => {
      expect(toRPN('10+((3-1)*2)/4')).toEqual([10, 3, 1, '-', 2, '*', 4, '/', '+'])
    })

    it('should handle decimal numbers', () => {
      expect(toRPN('2.5*2')).toEqual([2.5, 2, '*'])
    })

    it('should handle negative numbers', () => {
      expect(toRPN('-5+10')).toEqual([-5, 10, '+'])
    })

    it('should throw an error for mismatched parentheses', () => {
      expect(() => toRPN('3+4)')).toThrow('Mismatched parentheses.')
    })
  })

  // --- Unit Tests for calculateRPN (RPN evaluation) ---
  describe('calculateRPN', () => {
    it('should calculate simple addition', () => {
      expect(calculateRPN([3, 4, '+'])).toBe(7)
    })

    it('should calculate expression with precedence', () => {
      expect(calculateRPN([3, 4, 2, '*', '+'])).toBe(11)
    })

    it('should calculate expression with parentheses', () => {
      expect(calculateRPN([3, 4, '+', 2, '*'])).toBe(14)
    })

    it('should handle division', () => {
      expect(calculateRPN([10, 2, '/'])).toBe(5)
    })

    it('should throw an error for division by zero', () => {
      expect(() => calculateRPN([5, 0, '/'])).toThrow('Division by zero.')
    })

    it('should throw an error for invalid expressions', () => {
      // "3 4 +" is valid, but "3 4" is not, as it leaves two numbers on the stack
      expect(() => calculateRPN([3, 4])).toThrow('Invalid expression.')
    })
  })

  // --- Integration-like Tests for parseMoney ---
  describe('parseMoney', () => {
    it('should return a number if a number is passed', () => {
      expect(parseMoney(123.45)).toBe(123.45)
    })

    it('should parse a simple integer string', () => {
      expect(parseMoney('123')).toBe(123)
    })

    it('should parse a string with commas', () => {
      expect(parseMoney('1,234.56')).toBe(1234.56)
    })

    it('should return NaN for invalid strings', () => {
      expect(parseMoney('abc')).toBeNaN()
      expect(parseMoney('')).toBeNaN()
    })

    it('should correctly calculate complex expressions', () => {
      expect(parseMoney('100 * 2 + ( 30 - 10 ) / 2')).toBe(210)
    })

    it('should correctly calculate 3×4', () => {
      expect(parseMoney('3×4')).toBe(12)
    })

    it('should correctly calculate expressions with × symbol', () => {
      expect(parseMoney('100 × 2 + ( 30 - 10 ) / 2')).toBe(210)
    })

    it('should correctly calculate the example: 300 * 2 + (5 - 2) / 8', () => {
      expect(parseMoney('300 * 2 + (5 - 2) / 8')).toBe(600.375)
    })

    it('should handle negative results', () => {
      expect(parseMoney('10-20')).toBe(-10)
    })

    it('should handle floating point arithmetic', () => {
      expect(parseMoney('0.1 + 0.2')).toBeCloseTo(0.3)
    })

    it('should return NaN for invalid expressions like double operators', () => {
      expect(parseMoney('3++4')).toBeNaN()
      expect(parseMoney('3+*4')).toBeNaN()
    })
  })
})
