import _ from 'lodash';
import chai, { expect } from 'chai';
import spies from 'chai-spies';
import Calculator from '../src/index.js';

chai.use(spies);

/* eslint-disable no-unused-expressions */
describe('Calculator', () => {
  let src;
  beforeEach(() => {
    src = {
      aaa: 'aaa',
      bbb: 'bbb',
    };
  });

  it('should return unchanged object when no formulas', () => {
    const calc = new Calculator();
    expect(calc.calculate(src)).to.be.deep.equal(src);
  });

  it('should calculate constant formulas', () => {
    const calc = new Calculator({
      x: () => 42,
      y: () => 'foo',
    });
    const expected = {
      ...src,
      x: 42,
      y: 'foo',
    };
    expect(calc.calculate(src)).to.be.deep.equal(expected);
  });

  it('should calculate formula based on sibling fields', () => {
    src = { ...src, A: 10, B: 16 };
    const calc = new Calculator({
      x: ƒ => ƒ('A') + ƒ('B'),
    });
    const expected = {
      ...src,
      x: 10 + 16,
    };
    expect(calc.calculate(src)).to.be.deep.equal(expected);
  });

  it('should calculate formula based on other formulas', () => {
    src = { ...src, A: 10, B: 16 };
    const calc = new Calculator({
      a: ƒ => ƒ('A'),
      b: ƒ => ƒ('B'),
      ab: ƒ => ƒ('a') + ƒ('b'),
    });
    const expected = {
      ...src,
      a: 10,
      b: 16,
      ab: 10 + 16,
    };
    expect(calc.calculate(src)).to.be.deep.equal(expected);
  });

  it('should calculate formula for nested fields', () => {
    const calc = new Calculator({
      'x.y.z': () => 42,
      'a[1].b': () => 42,
    });
    const expected = {
      ...src,
      x: {
        y: {
          z: 42,
        },
      },
      a: [undefined, { b: 42 }],
    };
    expect(calc.calculate(src)).to.be.deep.equal(expected);
  });

  it('should have access to nested fields inside formula', () => {
    src = { ...src,
      obj: {
        A: 10,
        B: { C: 16 },
      },
    };
    const calc = new Calculator({
      objA: ƒ => ƒ('obj.A'),
      objBC: ƒ => ƒ('obj.B.C'),
    });
    const expected = {
      ...src,
      objA: 10,
      objBC: 16,
    };
    expect(calc.calculate(src)).to.be.deep.equal(expected);
  });

  it('should calculate formulas for list items `list.*`', () => {
    [{
      testingFor: 'single item in an array',
      obj: { ...src, list: [43] },
      formulas: { 'list.*': () => 42 },
      expected: { ...src, list: [42] },
    }, {
      testingFor: 'multiple items in an array',
      obj: { ...src, list: [42, 43] },
      formulas: { 'list.*': () => 0 },
      expected: { ...src, list: [0, 0] },
    }, {
      testingFor: 'empty array',
      obj: { ...src, list: [] },
      formulas: { 'list.*': () => 0 },
      expected: { ...src, list: [] },
    }, {
      testingFor: 'nonexisting array',
      obj: { ...src },
      formulas: { 'list.*': () => 0 },
      expected: { ...src },
    }, {
      testingFor: 'edge case: when list accessed first and fields in the list accessed second',
      obj: { ...src, list: [{ v: 42 }, { v: 43 }] },
      formulas: {
        total: ƒ => _.sum(_.map(ƒ('list'), (l, i) => ƒ(`list.${i}.v`))),
      },
      expected: { ...src,
        list: [{ v: 42 }, { v: 43 }],
        total: 42 + 43,
      },
    }].forEach(({ obj, formulas, expected, testingFor }) => {
      const calc = new Calculator(formulas);
      expect(calc.calculate(obj)).to.be.deep.equal(expected, testingFor);
    });
  });

  it('should calculate formulas for fields inside list items `list.*.field`', () => {
    [{
      testingFor: 'single item in an array',
      obj: { ...src, list: [{ field: 'zzz' }] },
      formulas: { 'list.*.field': ƒ => ƒ('aaa') },
      expected: { ...src, list: [{ field: 'aaa' }] },
    }, {
      testingFor: 'multiple items in an array',
      obj: { ...src, list: [{ field: 43 }, { field: 22, name: 'John' }] },
      formulas: { 'list.*.field': () => 42 },
      expected: { ...src, list: [{ field: 42 }, { field: 42, name: 'John' }] },
    }, {
      testingFor: 'deep nested path',
      obj: { ...src, list: [{ a: { b: 0 } }, { a: { b: 0, c: 1 } }] },
      formulas: { 'list.*.a.b': () => 1 },
      expected: { ...src, list: [{ a: { b: 1 } }, { a: { b: 1, c: 1 } }] },
    }].forEach(({ obj, formulas, expected, testingFor }) => {
      const calc = new Calculator(formulas);
      expect(calc.calculate(obj)).to.be.deep.equal(expected, testingFor);
    });
  });

  it('should have access to nested formulas inside formula', () => {
    src = { ...src,
      obj: {
        a: 10,
      },
    };
    const calc = new Calculator({
      'obj.aa': ƒ => ƒ('obj.a') * ƒ('obj.a'),
      objAA: ƒ => ƒ('obj.aa'),
    });
    const expected = { ...src,
      obj: {
        a: 10,
        aa: 100,
      },
      objAA: 100,
    };
    expect(calc.calculate(src)).to.be.deep.equal(expected);
  });

  it('should provide list item index into formula', () => {
    src = { ...src,
      list: [{ a: 1 }, { a: 2 }, { a: 3 }],
      arr: [1, 2, 3],
    };
    const calc = new Calculator({
      'list.*.a10': (ƒ, i) => ƒ(`list.${i}.a`) * 10,
      'arr.*': (ƒ, i) => ƒ(`list.${i}.a10`),
    });
    const expected = { ...src,
      list: [{ a: 1, a10: 10 }, { a: 2, a10: 20 }, { a: 3, a10: 30 }],
      arr: [10, 20, 30],
    };
    expect(calc.calculate(src)).to.be.deep.equal(expected);
  });

  it('should recalculate values in formulas with `*`', () => {
    src = { ...src,
      calculatedList: [0, 0, 0], // could be results from previous calculations
      valuesList: [1, 2, 3],
    };
    const calc = new Calculator({
      sumList: ƒ => ƒ('calculatedList.0') + ƒ('calculatedList.1') + ƒ('calculatedList.2'),
      'calculatedList.*': (ƒ, i) => ƒ(`valuesList.${i}`),
    });
    const expected = { ...src,
      sumList: 1 + 2 + 3,
      calculatedList: [1, 2, 3],
      valuesList: [1, 2, 3],
    };
    expect(calc.calculate(src)).to.be.deep.equal(expected);
  });

  it('should cache getter results', () => {
    const getters = chai.spy.object(['zero', 'one', 'two', 'three']);
    src = {
      get zero() { getters.zero(); return 0; },
    };
    const calc = new Calculator({
      one: (ƒ) => { getters.one(); return ƒ('zero') + 1; },
      two: (ƒ) => { getters.two(); return ƒ('one') + 1; },
      three: (ƒ) => { getters.three(); return ƒ('two') + 1; },
    });
    const expected = {
      zero: 0,
      one: 1,
      two: 2,
      three: 3,
    };
    expect(calc.calculate(src)).to.be.deep.equal(expected);

    // one call from formulas another from accessing src
    expect(getters.zero).to.have.been.called.exactly(2);
    expect(getters.one).to.have.been.called.exactly(2);
    expect(getters.two).to.have.been.called.exactly(2);
    expect(getters.three).to.have.been.called.exactly(1);
  });

  it('should reset cache on each new calc', () => {
    const getters = chai.spy.object(['one', 'two', 'three']);
    src = {
      zero: 0,
    };
    const calc = new Calculator({
      one: (ƒ) => { getters.one(); return ƒ('zero') + 1; },
      two: (ƒ) => { getters.two(); return ƒ('one') + 1; },
      three: (ƒ) => { getters.three(); return ƒ('two') + 1; },
    });
    const expected = {
      zero: 0,
      one: 1,
      two: 2,
      three: 3,
    };
    expect(calc.calculate(src)).to.be.deep.equal(expected);
    expect(getters.one).to.have.been.called.exactly(2);
    expect(getters.two).to.have.been.called.exactly(2);
    expect(getters.three).to.have.been.called.exactly(1);

    // calc with updated input
    src.zero = 1;
    getters.one.reset();
    getters.two.reset();
    getters.three.reset();
    expected.zero = 1;
    expected.one = 2;
    expected.two = 3;
    expected.three = 4;

    expect(calc.calculate(src)).to.be.deep.equal(expected);
    expect(getters.one).to.have.been.called.exactly(2);
    expect(getters.two).to.have.been.called.exactly(2);
    expect(getters.three).to.have.been.called.exactly(1);
  });

  it('should recalculate outdated formulas', () => {
    src = {
      crops: [{
        acres: 10,
        price: 1,
        results: { profit: -1 }, // from previous calculation
      }, {
        acres: 10,
        price: 2,
        results: { profit: -1 }, // from previous calculation
      }],
    };
    const calc = new Calculator({
      totalAcres: ƒ => _.sum(ƒ('crops').map((unused, i) => ƒ(`crops.${i}.acres`))),
      totalFarmProfit: ƒ => _.sum(ƒ('crops').map((unused, i) => ƒ(`crops.${i}.results.profit`))),
      'crops.*.results.profit': (ƒ, i) => ƒ(`crops.${i}.acres`) * ƒ(`crops.${i}.price`),
    });
    const expected = {
      crops: [{
        acres: 10,
        price: 1,
        results: { profit: 10 },
      }, {
        acres: 10,
        price: 2,
        results: { profit: 20 },
      }],
      totalAcres: 20,
      totalFarmProfit: 30,
    };
    expect(calc.calculate(src)).to.be.deep.equal(expected);
  });

  it('should force invalud values to zero when `forceZeros` is true', () => {
    src = {
      NaN,
      undefined,
      null: null,
      empty: '',
    };
    const formulas = {
      ƒNaN: ƒ => ƒ('NaN'),
      ƒUndefined: ƒ => ƒ('undefined'),
      ƒNull: ƒ => ƒ('null'),
      ƒEmpty: ƒ => ƒ('empty'),
    };
    expect(new Calculator(formulas).calculate(src)).to.be.deep.equal({
      ...src,
      ƒNaN: NaN,
      ƒUndefined: undefined,
      ƒNull: null,
      ƒEmpty: '',
    }, 'do not force zeros');

    expect(new Calculator(formulas, { forceZeros: true }).calculate(src)).to.be.deep.equal({
      ...src,
      ƒNaN: 0,
      ƒUndefined: 0,
      ƒNull: 0,
      ƒEmpty: 0,
    }, 'force zeros');
  });
});
