import _ from 'lodash';

function Calculator(formulas, options = {}) {
  this.formulas = formulas;
  this.options = options;
}

Calculator.prototype.calculate = function calculate(item) {
  // replace any * in formulas with explicit list indexes
  const expandedFormulas = _.reduce(this.formulas, (result, formula, path) => {
    /* eslint-disable no-param-reassign */
    if (path.indexOf('*') > -1) {
      // split formula path into two parts:
      // 'list.path.*.field.path' → [ 'list.path', 'field.path' ]
      const [listPath, fieldPath] = path.split(/\.\*\.?/);
      const list = _.get(item, listPath, []);
      const indexedFormula = _.curryRight(formula, 2);
      for (let i = 0; i < list.length; i += 1) {
        const explicitPath = `${listPath}.${i}${fieldPath ? `.${fieldPath}` : ''}`;
        result[explicitPath] = indexedFormula(i);
        // non-functional alternative is
        // result[explicitPath] = ƒ => formula(ƒ, i)
      }
    } else {
      result[path] = formula;
    }
    return result;
    /* eslint-enable no-param-reassign */
  }, {});

  const cache = {};
  const getter = (path) => {
    if (!(path in cache)) {
      let value = expandedFormulas[path] ? expandedFormulas[path](getter) : _.get(item, path);
      if (_.isNaN(value) || _.isUndefined(value) || _.isNull(value) || value === '') {
        if (this.options.forceZeros) {
          value = 0;
        }
      }
      cache[path] = value;
    }
    return cache[path];
  };

  const resolvedFormulas = _.reduce(expandedFormulas, (result, formula, path) => {
    _.set(result, path, formula(getter));
    return result;
  }, {});

  return _.merge({}, item, resolvedFormulas);
};

export default Calculator;
