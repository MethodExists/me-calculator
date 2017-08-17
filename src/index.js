import _ from 'lodash';

function Calculator(formulas) {
  this.formulas = formulas;
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

  const getter = (path) => {
    // console.log('getter', path, expandedFormulas[path] ? expandedFormulas[path](getter) : _.get(item, path));
    // TODO
    // 1. make tests works
    // 2. cache the getter to avoid 50k+ calls
    // 3. log all values which getter produces, see if it safe to convert NaN, null, undefined to zeros?
    let value = expandedFormulas[path] ? expandedFormulas[path](getter) : _.get(item, path);
    if (_.isNaN(value) || _.isNull(value)) {
      value = 0;
    }
    return value;
  };

  const resolvedFormulas = _.reduce(expandedFormulas, (result, formula, path) => {
    // console.log('ƒ', path, formula(getter));
    _.set(result, path, formula(getter));
    return result;
  }, {});

  return _.merge({}, item, resolvedFormulas);
};

export default Calculator;
