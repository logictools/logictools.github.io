'use strict';

angular
    .module('logicToolsApp', ['ui.router'])
    .config(function ($stateProvider, $urlRouterProvider) {
        $urlRouterProvider.otherwise('/');
        $stateProvider
            .state('main', {
                url: '/',
                templateUrl: 'templates/main.html',
                controller: 'MainCtrl as main'
            })
            .state('truthTables', {
                url: '/truth-tables',
                templateUrl: 'templates/truth-table.html',
                controller: 'TruthTableCtrl as table'
            })
            .state('fitchSystems', {
                url: '/fitch',
                templateUrl: 'templates/fitch.html',
                controller: 'FitchCtrl as fitch'
            });
    })

'use strict';

angular
  .module('logicToolsApp')
  .controller('FitchCtrl', function (
      FitchStack,
      Premise,
      PremiseTree,
      fitchBicondition,
      fitchConjunction,
      fitchDisjunction,
      fitchImplication,
      fitchNegation,
      syntaxChecker
    ) {

      _init.call(this);

      this.assume = function() {
        var currentScope, labels, headPremise;

        headPremise = Premise.new({
          value: this.premise
        });

        if (!syntaxChecker.validate(headPremise)) {
          return;
        }

        this.structure.openScope(headPremise);
        currentScope = this.structure.getCurrentScope();
        headPremise.scopeId = currentScope.id;
        headPremise.scopeLayer = currentScope.layer;
        this.premiseGraph.appendNode(headPremise);
        this.premise = '';
      };

      this.refresh = function () {
        _init.call(this);
      }

      this.closeDisjoinField = function () {
        this.showDisjoinField = false;
        this.valueToDisjoin = '';
      }

      this.disjoinPremise = function () {
        var newPremises, currentScope, selected, disjointPremise;
        currentScope = this.structure.getCurrentScope();
        selected = _getValidSelecedPremises(this.premiseGraph.premises, this.structure.scopes);
        _uncheckPremises(this.premiseGraph.premises, this.selected);
        if (!selected.length || !this.valueToDisjoin) {
            return;
        }
        newPremises = fitchDisjunction.introduction(this.valueToDisjoin, selected, currentScope);
        this.showDisjoinField = false;
        this.valueToDisjoin = '';
        if (!newPremises) {
            return;
        }
        _multipleEntialment.call(this, newPremises, selected);
      };

      /*Operations*/
      this.andIntroduction = function () {
        var selected, newPremises, secondPremise, currentScope;
        currentScope = this.structure.getCurrentScope();
        selected = _getValidSelecedPremises(this.premiseGraph.premises, this.structure.scopes);
        _uncheckPremises(this.premiseGraph.premises, this.selected);
        if (selected.length < 2) {
          return;
        }
        newPremises = fitchConjunction.introduction(selected, currentScope);
        if (!newPremises) {
          return;
        }
        _multipleEntialment.call(this, newPremises, selected);
      };
      this.andElimination = function () {
        var selected, newPremises, secondPremise, currentScope;
        currentScope = this.structure.getCurrentScope();
        selected = _getValidSelecedPremises(this.premiseGraph.premises, this.structure.scopes);
        _uncheckPremises(this.premiseGraph.premises, this.selected);
        if (selected.length !== 1) {
          return;
        }
        newPremises = fitchConjunction.elimination(selected[0], currentScope);
        if (!newPremises) {
          return;
        }
        _multipleEntialment.call(this, newPremises, selected);
      };
      this.negationIntro = function() {
        var selected, newPremise, secondPremise, currentScope;
        currentScope = this.structure.getCurrentScope();
        selected = _getValidSelecedPremises(this.premiseGraph.premises, this.structure.scopes);
        _uncheckPremises(this.premiseGraph.premises, this.selected);
        if (selected.length !== 2) {
          return;
        }
        newPremise = fitchNegation.introduction(selected[0], selected[1], currentScope);
        if (!newPremise) {
          return;
        }
        _entail.call(this, newPremise, selected);
      };
      this.negationElim = function() {
        var selected, newPremise, secondPremise, currentScope;
        currentScope = this.structure.getCurrentScope();
        selected = _getValidSelecedPremises(this.premiseGraph.premises, this.structure.scopes);
        _uncheckPremises(this.premiseGraph.premises, this.selected);
        if (selected.length > 1) {
          return;
        }
        newPremise = fitchNegation.elimination(selected[0], currentScope);
        if (!newPremise) {
          return;
        }
        _entail.call(this, newPremise, selected);
      };
      this.implicationIntro = function() {
        var lastScope, currentScope, newPremise;
        lastScope = this.structure.closeScope();
        currentScope = this.structure.getCurrentScope();
        newPremise = fitchImplication.introduction(currentScope, lastScope);
        _entail.call(this, newPremise, [lastScope.head, lastScope.last]);
        _uncheckPremises(this.premiseGraph.premises, this.selected);
      };

      this.implicationElim = function() {
        var selected, newPremise, secondPremise, currentScope;
        currentScope = this.structure.getCurrentScope();
        selected = _getValidSelecedPremises(this.premiseGraph.premises, this.structure.scopes);
        _uncheckPremises(this.premiseGraph.premises, this.selected);
        if (selected.length !== 2) {
          return;
        }
        newPremise = fitchImplication.elimination(selected[0], selected[1], currentScope);
        if (!newPremise) {
          return;
        }
        _entail.call(this, newPremise, selected);
      };

      this.orElimination = function () {
        var selected, currentScope, newPremise, groupedPremises;
        currentScope = this.structure.getCurrentScope();
        selected = _getValidSelecedPremises(this.premiseGraph.premises, this.structure.scopes);
        _uncheckPremises(this.premiseGraph.premises, this.selected);
        if (selected.length < 3) {
          return;
        }
        groupedPremises = _groupOrPremises(selected);
        if (!groupedPremises) {
          return;
        }
        newPremise = fitchDisjunction.elimination(groupedPremises, currentScope);
        if (!newPremise) {
          return;
        }
        _entail.call(this, newPremise, groupedPremises);
      };
      this.orIntroduction = function () {
        this.showDisjoinField = true;
      };
      this.reiterate = function() {
        var reiterated, currentScope, selected;
        currentScope = this.structure.getCurrentScope();
        selected = _getValidSelecedPremises(this.premiseGraph.premises, this.structure.scopes);
        reiterated = selected.map(function(premise, key) {
                            return Premise.new({
                                scopeLayer: currentScope.layer,
                                scopeId: currentScope.id,
                                value: premise.value
                            });
                        });
        _.forEach(reiterated, function (premise) {
          _entail.call(this, premise, selected);
        }.bind(this));
        _uncheckPremises(this.premiseGraph.premises, this.selected);
      };
      this.delete = function () {
        var selected, scopeIds;
        selected = _getSelectedPremises(this.premiseGraph.premises);
        _.forEach(selected, function (premise) {
          this.premiseGraph.removeNode(premise);
        }.bind(this));
        scopeIds = _.map(this.premiseGraph.premises, 'scopeId');
        this.structure.reset(this.premiseGraph.premises);
      };
      this.biconditionalIntro = function () {
        var selected, newPremises, secondPremise, currentScope;
        currentScope = this.structure.getCurrentScope();
        selected = _getValidSelecedPremises(this.premiseGraph.premises, this.structure.scopes);
        _uncheckPremises(this.premiseGraph.premises, this.selected);
        if (selected.length !== 2) {
          return;
        }
        newPremises = fitchBicondition.introduction(selected, currentScope);
        if (!newPremises) {
          return;
        }
        _multipleEntialment.call(this, newPremises, selected);
      }
      this.biconditionalElim = function () {
        var selected, newPremises, secondPremise, currentScope;
        currentScope = this.structure.getCurrentScope();
        selected = _getValidSelecedPremises(this.premiseGraph.premises, this.structure.scopes);
        _uncheckPremises(this.premiseGraph.premises, this.selected);
        if (selected.length !== 1) {
          return;
        }
        newPremises = fitchBicondition.elimination(selected[0], currentScope);
        if (!newPremises) {
          return;
        }
        _multipleEntialment.call(this, newPremises, selected);
      }

      /*Local functions*/
      function _init() {
        this.marginLeft = 20; //pixels
        this.premise = '';
        this.premiseGraph = PremiseTree.new();
        this.selected = [];
        this.showDisjoinField = false;
        this.structure = FitchStack.new();
        this.valueToDisjoin = '';
      }
      function _entail(premise, parentPremises) {
        this.structure.entail(premise);
        _appendPremiseChild(this.premiseGraph, premise, parentPremises);
      }

      function _multipleEntialment(premises, parentPremises) {
        _.forEach(premises, function (premise) {
          _entail.call(this, premise, parentPremises);
        }.bind(this));
      }

      function _getSelectedPremises(premises) {
        return _.filter(premises, 'checked');
      }

      function _getValidSelecedPremises(premises, scopes) {
        var scopeIds = _.map(scopes, 'id');
        return _getSelectedPremises(premises)
               .filter(function(premise) {
                    return scopeIds.indexOf(premise.scopeId) !== -1;
                });
      }

      function _uncheckPremises(premises, selected) {
        selected.length = 0;
        return _.map(premises, function(premise) {
            premise.checked = false;
            return premise;
        });
      }

      function _groupOrPremises(premises) {
        var disjunctions, implications;
        disjunctions = _.filter(premises, function (premise) {
          return premise.isOr(premise.digest());
        });
        if  (disjunctions.length !== 1) {
          return null;
        }
        implications = _.filter(premises, function (premise) {
          return premise.isImplication(premise.digest());
        });
        if  (implications.length !== premises.length - 1) {
          return null;
        }
        return {
          disjunctions: disjunctions,
          implications: implications
        };
      }

      function _appendPremiseChild(structrue, childPremise, parentPremises) {
        _.forEach(parentPremises, function (premise) {
          structrue.appendChildNode(premise, childPremise);
        });
      }

    });

'use strict';
angular
  .module('logicToolsApp')
  .controller('MainCtrl', function ($location) {
        this.goToTruth = function() {
            $location.path('/truth-tables');
        };
        this.goToFitch = function() {
            $location.path('/fitch');
        };
  });

'use strict';

angular.module('logicToolsApp')
  .controller('MenuCtrl', function () {
    
  });

'use strict';

angular
  .module('logicToolsApp')
  .controller('TruthTableCtrl', function (tableGenerator) {
        this.premises = [];
        this.selectedPremises = [];
        this.premise = '';
        this.truthTable = {};
        this.build = function() {
            if(this.premise) {
                tableGenerator.generate(this.premise);
                this.truthTable.header = getTableHeader(tableGenerator);
                this.truthTable.rows = getTableRows(tableGenerator);
            }
        };
        function readPremise(premise) {
            return premise.trim().split(/\s+/g);
        }
        function getTableHeader(table) {
            return _.chain(table.value).keys().map(function(val, key) {
                return (val in this.labels) ? this.labels[val] : val;
            }.bind(table)).value();
        }
        function getTableRows(table) {
            var rows, tableValue;
            rows = [];
            tableValue = table.value;
            _.each(_.values(tableValue), function(col, keyc) {
                _.each(col, function(val, keyr) {
                    if (!rows[keyr]) {
                      rows.push([]);
                    }
                    rows[keyr][keyc] = val;
                });
            });
            return rows;
        }
  });

'use strict';

angular
  .module('logicToolsApp')
  .factory('formula', function() {

    function isThen(premise) {
      return /[=][>]/g.exec(premise);
    }
    function isAnd(premise) {
      return /[&]/g.exec(premise);
    }
    function isOr(premise) {
      return /[|]/g.exec(premise);
    }
    function isBicon(premise) {
      return /[<][=][>]/g.exec(premise);
    }

    return {
      /*Truth table methods*/
      resultFn: function(premise) {
        var getResult;
        if (isBicon(premise)) {
            getResult = function(a, b) {
                return (!a || b) && (!b || a);
            }
        } else if (isThen(premise)) {
            getResult = function(a, b) {
                return !a || b;
            }
        } else if (isAnd(premise)) {
            getResult = function(a, b) {
                return a && b;
            }
        } else if (isOr(premise)) {
            getResult = function(a, b) {
                return a || b;
            }
        }
        return getResult;
      }
    }
  });

angular
  .module('logicToolsApp')
  .service('syntaxChecker', function () {
    this.validate = function (premise) {
      if (_emptyPremise(premise)) {
        return false;
      }

      return true;
    }

    function _emptyPremise(premise) {
      return !premise.value;
    }
    
  });

angular
  .module('logicToolsApp')
  .factory('FitchStack', function(Scope) {

    var scopeLayer, universalScope;
    scopeLayer = 0;
    universalScope = Scope.new({
      layer: scopeLayer
    });

    function FitchStack(props) {
      scopeLayer = 0;
      this.scopes = [universalScope];
      this.scopeHistory = [universalScope];
    }

    FitchStack.prototype.closeScope = function() {
      var removedScope, newCurrentScope;
      removedScope = _.remove(this.scopes, 'isFocused');
      newCurrentScope = this.scopes[this.scopes.length - 1];
      if (!newCurrentScope) {
        return removedScope[0];
      }
      newCurrentScope.focus();
      newCurrentScope.layer = --scopeLayer;
      return removedScope[0];
    };

    FitchStack.prototype.openScope = function(headAssumption) {
      var scope = Scope.new({
        head: headAssumption,
        layer: ++scopeLayer
      });

      if (this.scopes.length) {
        this.scopes = _.map(this.scopes, function(scope) {
          scope.blur();
          return scope;
        });
      }

      this.scopes.push(scope);
      this.scopeHistory.push(scope);
    };

    FitchStack.prototype.entail = function(assumption) {
      var currentScope = this.getCurrentScope();
      currentScope.append(assumption);
    };

    FitchStack.prototype.getCurrentScope = function() {
      return _.filter(this.scopes, 'isFocused')[0];
    };

    FitchStack.prototype.reset = function (premises) {
      var currentScope;
      this.scopes.length = 0;
      this.scopeHistory.length = 0;
      this.scopes = _setScopesItems(_createScopes(premises), premises);
      currentScope = _.find(this.scopes, {
        id: _getLastItem(premises).scopeId
      });
      currentScope.focus();
      scopeLayer = currentScope.layer;
      this.scopeHistory = this.scopes;
      this.scopes = _getActiveScopes(this.scopes, premises);
    }

    function _getLastItem(items) {
      return items.slice(-1)[0];
    }

    function _createScopes(premises) {
      var scopes = _.chain(premises)
                    .map(function (premise) {
                      return {
                        layer: premise.scopeLayer,
                        id: premise.scopeId
                      };
                    })
                    .uniqBy('id')
                    .map(function (scopeBase) {
                      return Scope.new({
                        layer: scopeBase.layer,
                        id: scopeBase.id
                      });
                    })
                    .value();
      return _.find(scopes, {layer: 0}) 
                  ? scopes
                  : [universalScope].concat(scopes);
    }

    function _premisesByScope(premises) {
      return _.groupBy(premises, 'scopeId');
    }

    function _setScopesItems(scopes, premises) {
      return _.chain(scopes)
              .map(function (scope) {
                scope.items = _.sortBy(_premisesByScope(premises)[scope.id], 'scopeId');
                scope.blur();
                return scope;
              })
              .value();
    }

    function _getActiveScopes(scopes, premises) {
      var prevScopeLayer, prevScopePosition, activeIds, scopePosition;
      activeIds = [universalScope.id];
      prevScopeLayer = 0;
      _.forEach(premises, function (premise) {
        scopePosition = activeIds.indexOf(premise.scopeId);
        if (prevScopeLayer <= premise.scopeLayer && scopePosition === -1) {
          activeIds.push(premise.scopeId);
        } else if (prevScopeLayer > premise.scopeLayer && scopePosition !== -1) {
          activeIds.splice(prevScopePosition, 1);
        }
        prevScopeLayer = premise.scopeLayer;
        prevScopePosition = scopePosition;
      });
      return _.filter(scopes, function (scope) {
        return activeIds.indexOf(scope.id) !== -1;
      });
    }

    return {
      new: function(props) {
        var fitchProps = props || {};
        return new FitchStack(fitchProps);
      }
    }

  });

angular
  .module('logicToolsApp')
  .factory('PremiseTree', function () {

    function PremiseTree(props) {
      this.premises = [];
      this.proofTree = [];
    }

    PremiseTree.prototype.appendNode = function (premiseNode) {
      this.proofTree.push([]);
      this.premises.push(premiseNode);
    }

    PremiseTree.prototype.appendChildNode = function (parentPremise, childPremise) {
      var parentIndex, childIndex;
      parentIndex = this.premises.indexOf(parentPremise);
      childIndex = this.premises.indexOf(childPremise);

      this.proofTree[parentIndex].push(childPremise.id);

      if (childIndex === -1) {
        this.premises.push(childPremise);
        this.proofTree.push([]);
      }
    }

    PremiseTree.prototype.removeNode = function (premiseToRemove) {
      var childrenIds, grandChildrenIds;
      childrenIds = _getChildrenIds(this.proofTree, this.premises, premiseToRemove);
      while (childrenIds.length) {
        grandChildrenIds = _getGrandchildren(this.proofTree, this.premises, childrenIds);
        this.proofTree = _cutTree(this.proofTree, this.premises, childrenIds);
        this.premises = _cutPremises(this.premises, childrenIds);
        childrenIds = grandChildrenIds;
      }
      this.proofTree = _removeTreeNode(this.proofTree, this.premises, premiseToRemove);
      this.premises = _removePremise(this.premises, premiseToRemove);
      return this.premises;
    }

    function _removePremise(premises, premiseToRemove) {
      var filteredPremises = _.filter(premises, function (premise) {
        return premise.id !== premiseToRemove.id;
      });
      return _mergePremiseScopes(filteredPremises, premiseToRemove);
    }

    function _removeChildNode(node, childNode) {
      return _.filter(node, function (child) {
        return child !== childNode;
      });
    }

    function _removeInvalidChildren(node, premises) {
      return _.filter(node, function (child) {
        return !!_findPremise(premises, child);
      });
    }

    function _removeTreeNode(proofTree, premises, premiseToRemove) {
      var premiseIndex = _getPremiseNodeIndex(premises, premiseToRemove);
      return _.chain(proofTree)
              .filter(function (node, indexNode) {
                return indexNode !== premiseIndex;
              })
              .map(function (node) {
                var newNode = _removeChildNode(node, premiseToRemove.id);
                return _removeInvalidChildren(newNode, premises);
              })
              .value();
    }

    function _findPremise(premises, id) {
      return _.find(premises, {id: id});
    }

    function _getChildrenIds(proofTree, premises, premise) {
      var index = _getPremiseNodeIndex(premises, premise);
      return proofTree[index];
    }

    function _getPremiseNodeIndex(premises, premise) {
      return _.chain(premises)
              .map('id')
              .indexOf(premise.id)
              .value();
    }

    function _cutTree(proofTree, premises, ids) {
      return _.filter(proofTree, function (node, indexNode) {
        return ids.indexOf(premises[indexNode].id) === -1;
      });
    }

    function _cutPremises(premises, ids) {
      return  _.filter(premises, function (premise) {
        return ids.indexOf(premise.id) === -1;
      });
    }

    function _getGrandchildren(proofTree, premises, childrenIds) {
      return _.chain(childrenIds)
              .map(function (id) {
                var premise = _findPremise(premises, id) || {};
                return _getChildrenIds(proofTree, premises, premise);
               })
              .flattenDeep()
              .filter(function (id) {
                return !!id;
              })
              .value();
    }

    function _mergePremiseScopes(premises, premiseToRemove) {
      var prevScopeId, prevScopeLayer, layerIncrement;
      layerIncrement = 0;
      return _.map(premises, function (premise) {
        if (prevScopeLayer === premise.scopeLayer && prevScopeId !== premise.scopeId) {
          layerIncrement++;
        }
        prevScopeLayer = premise.scopeLayer;
        prevScopeId = premise.scopeId;
        premise.scopeLayer += layerIncrement;
        return premise;
      });
    }

    return {
      new: function (props) {
        return new PremiseTree(props);
      }
    };

  });

angular
  .module('logicToolsApp')
  .factory('Scope', function() {

    var id = 0;
    function Scope(props) {
      this.id = props.id || ++id;
      this.layer = props.layer;
      this.isFocused = true;
      this.items = [];

      if (props.head) {
        this.items.push(props.head);
      }
    }

    Scope.prototype.append = function(item) {
      this.items.push(item);
    }

    Scope.prototype.blur = function() {
      this.isFocused = false;
    }

    Scope.prototype.focus = function() {
      this.isFocused = true;
    }

    Scope.prototype.remove = function(item) {
      var index = item.indexOf(item);
      return this.items.splice(index, 1);
    }

    Object.defineProperty(Scope.prototype, 'head', {
      get: function() {
        return this.items[0];
      }
    });

    Object.defineProperty(Scope.prototype, 'last', {
      get: function() {
        return this.items[this.items.length - 1];
      }
    });

    Object.defineProperty(Scope.prototype, 'size', {
      get: function() {
        return this.items.length;
      }
    });

    return {
      new: function(props) {
        var scopeProps = props || {};
        return new Scope(scopeProps);
      }
    }

  });

angular
  .module('logicToolsApp')
  .service('fitchBicondition', function (Premise) {
    this.introduction = function (premises, scope) {
      if (!_validatePremises(premises[0], premises[1])) {
        return null;
      }
      if (!_validateImplications(premises[0], premises[1])) {
        return null;
      }
      return _getBiconditions(premises, scope);
    };

    this.elimination = function (premise, scope) {
      var digested = premise.digest();
      if (!premise.isBicon(digested)) {
        return null;
      }

      return _getImplications(premise, digested, scope);
    }

    function _validatePremises(firstPremise, secondPremise) {
      var firstValue, secondValue;
      firstValue = firstPremise.digest();
      secondValue = secondPremise.digest();
      return firstPremise.isImplication(firstValue) && secondPremise.isImplication(secondValue);
    }
    function _validateImplications(firstPremise, secondPremise) {
      var firstValue, secondValue, firstConclusion, firstAssumption,
          secondConclusion, secondAssumption;
      firstValue = firstPremise.digest();
      secondValue = secondPremise.digest();
      firstConclusion = firstPremise.getExpandedConclusion(firstValue);
      firstAssumption = firstPremise.getExpandedAssumption(firstValue);
      secondConclusion = secondPremise.getExpandedConclusion(secondValue);
      secondAssumption = secondPremise.getExpandedAssumption(secondValue);
      return firstConclusion === secondAssumption && secondConclusion === firstAssumption;
    }
    function _getImplications(premise, digested, scope) {
      var atomics, index;
      atomics = digested.split(/[<][=][>]/g);
      index = atomics.length;
      return _.map(atomics, function (atomicPremise) {
        index--;
        return Premise.new({
          scopeLayer: scope.layer,
          scopeId: scope.id,
          value: premise.expand(atomicPremise) + '=>' + premise.expand(atomics[index])
        });
      });
    }
    function _getBiconditions(premises, scope) {
      return _.map(premises, function (premise) {
        var value = premise.digest()
        return Premise.new({
          scopeLayer: scope.layer,
          scopeId: scope.id,
          value: premise.getExpandedConclusion(value) + '<=>' + premise.getExpandedAssumption(value)
        })
      });
    }
  });

angular
  .module('logicToolsApp')
  .service('fitchConjunction', function (Premise) {
    this.introduction = function (premises, scope) {
      var selectedValues = _.map(premises, function (premise) {
          return (premise.isCompound())
                    ? '(' + premise.value + ')'
                    : premise.value;
      })
      return _getConjuctions(selectedValues, scope);
    }
    this.elimination = function (premise, scope) {
      var digestedPremise = premise.digest();
      return _.chain(digestedPremise)
              .split(/\&+/)
              .map(function (simplePremise) {
                var expanded = premise.expand(simplePremise)
                return Premise.new({
                  scopeLayer: scope.layer,
                  scopeId: scope.id,
                  value: premise.unwrap(expanded)
                });
              })
              .value();
    }

    function _getConjuctions(premisesValue, scope) {
      return _.chain(premisesValue)
              .map(function (premiseValue) {
                return _getPosibleJoins(premiseValue, premisesValue, scope);
              })
              .flattenDeep()
              .value();
    }

    function _getPosibleJoins(value, premisesValue, scope) {
      return _.map(premisesValue, function (premiseValue) {
        return Premise.new({
          scopeLayer: scope.layer,
          scopeId: scope.id,
          value: value + '&' + premiseValue
        });
      });
    }
  });

'use strict';

angular
  .module('logicToolsApp')
  .service('fitchDisjunction', function (Premise) {

    this.elimination = function (premises, scope) {
      var uniqueConclusions, assumptions, disjunction;
      assumptions = _getAssumptions(premises.implications);
      uniqueConclusions = _getUniqueConclusions(premises.implications);

      if(uniqueConclusions.length !== 1) {
        return null;
      }

      if(!_isValidOperation(assumptions, premises.disjunctions[0])) {
        return null;
      }

      return Premise.new({
        scopeLayer: scope.layer,
        scopeId: scope.id,
        value: uniqueConclusions[0]
      });

    }

    this.introduction = function (value, selected, scope) {
      var selectedValues = _.map(selected, function (premise) {
          return (premise.isCompound())
                    ? '(' + premise.value + ')'
                    : premise.value;
      });

      return _getDisjunctions(value, selectedValues, scope)
    }

    function _getUniqueConclusions(implications) {
      return _.chain(implications)
              .map(function (premise) {
                  return premise.expand(premise.getConclusion(premise.digest()));
              })
              .uniq()
              .value();
    }

    function _getAssumptions(implications) {
      return _.map(implications, function (premise) {
                   return premise.expand(premise.getAssumption(premise.digest()));
              });
    }

    function _getDisjunctions(value, premisesValue, scope) {
      return _.chain(premisesValue)
              .map(function (premiseValue) {
                return _getPosibleJoins([value, premiseValue], scope);
              })
              .flattenDeep()
              .value();
    }

    function _getPosibleJoins(premisesValue, scope) {
      var index = premisesValue.length;
      return _.map(premisesValue, function (premiseValue) {
        index--;
        return Premise.new({
          scopeLayer: scope.layer,
          scopeId: scope.id,
          value: premiseValue + '|' + premisesValue[index]
        });
      });
    }

    function _isValidOperation(premises, disjunction) {
      var structure, assumptions;
      structure = disjunction.digest();
      assumptions = premises.slice();

      return _.filter(structure.split(/\|+/), function(label) {
          return assumptions.indexOf(disjunction.expand(label)) !== -1
      }).length === premises.length;
    }

  });

'use strict';

angular
  .module('logicToolsApp')
  .service('fitchImplication', function (Premise) {

    this.introduction = function(scope, lastScope) {
      var head, last, digestedHead, digestedLast, assumption, conclusion;
      head = lastScope.head;
      last = lastScope.last;
      digestedHead = head.digest();
      digestedLast = last.digest();

      assumption = (head.isCompound(head.value))
                      ? '(' + head.value + ')'
                      : head.value;

      conclusion = (last.isCompound(last.value))
                      ? '(' + last.value + ')'
                      : last.value;
      
      if (head.hasNegation(digestedHead) && digestedHead !== head.value) {
          assumption = head.value;
      }
      if (last.hasNegation(digestedLast) && digestedLast !== last.value) {
          conclusion = last.value;
      }

      return Premise.new({
        scopeLayer: scope.layer,
        scopeId: scope.id,
        value: assumption + '=>' + conclusion
      });
    };

    this.elimination = function(premiseOne, premiseTwo, scope) {
      var newPremise = eliminate(premiseTwo, premiseOne, scope) || eliminate(premiseOne, premiseTwo, scope);
      if (!newPremise) {
        return null;
      }
      newPremise.scopeLayer = scope.layer;
      newPremise.scopeId = scope.id;
      return newPremise;
    };

    function eliminate(premiseOne, premiseTwo, scope) {
      var assumption, conclusion, structure, assumptionNegated;
      structure = premiseOne.digest();
      assumption = premiseOne.getAssumption(structure);
      assumptionNegated = premiseOne.hasNegation(assumption);
      assumption = premiseOne.expand(assumption);
      assumption = (assumptionNegated)
      ? assumption
      : premiseOne.unwrap(assumption);

  		if (assumption === premiseTwo.value) {
        conclusion = premiseOne.getConclusion(structure);
  			return Premise.new({
  				scopeLayer : scope.layer,
  				scopeId : scope.id,
  				value: premiseOne.expand(conclusion)
  			});
  		}
    	return null;
    }
  });

'use strict';

angular
  .module('logicToolsApp')
  .service('fitchNegation', function (Premise) {

    this.introduction = function(premiseOne, premiseTwo, scope) {
      var newValue;

    	if (!_validImplications(premiseOne, premiseTwo)) {
  			return null;
  		}
  		if (!_validPremises(premiseOne, premiseTwo)) {
  			return null;
  		}
  		if (!_validNegations(premiseOne, premiseTwo)) {
  			return null;
  		}
  		if (!_validConclusions(premiseOne, premiseTwo)) {
  			return null;
  		}

      newValue = _getAssumption(premiseOne);

      return Premise.new({
        scopeLayer: scope.layer,
        scopeId: scope.id,
  	    value: '~' + newValue
      });
    };

    this.elimination = function(premise, scope) {
      var structure, newValue, negations;
      structure = premise.digest();
      negations = premise.value.match(/^\~+/)[0];

      if (negations.length <= 1) {
          return;
      }

      newValue = negations.slice(2) + premise.removeNegation(structure);
      newValue = (!premise.hasNegation(newValue))
      ? premise.unwrap(premise.expand(newValue))
      : premise.expand(newValue);

  		return Premise.new({
        scopeLayer: scope.layer,
        scopeId: scope.id,
        value: newValue
      });
  	};

  	function _validImplications(premiseOne, premiseTwo) {
  		return premiseOne.isImplication() && premiseTwo.isImplication();
  	}

  	function _validPremises(premiseOne, premiseTwo) {
  		return _getAssumption(premiseOne) === _getAssumption(premiseTwo);
  	}

  	function _validNegations(premiseOne, premiseTwo) {
  		return _validNegation(premiseOne, premiseTwo) || _validNegation(premiseTwo, premiseOne);
  	}

  	function _validConclusions(premiseOne, premiseTwo) {
  		return _validConclusion(premiseOne, premiseTwo) || _validConclusion(premiseTwo, premiseOne);
  	}

  	function _validConclusion(premiseOne, premiseTwo) {
  		return _getPureConclusion(premiseOne) === _getConclusion(premiseTwo);
  	}

  	function _validNegation(premiseOne, premiseTwo) {
      var conclusionOne, conclusionTwo;
      conclusionOne = _getRawConclusion(premiseOne);
      conclusionTwo = _getRawConclusion(premiseTwo);
  		return premiseOne.hasNegation(conclusionOne) && !premiseOne.hasNegation(conclusionTwo);
  	}

    function _removeNegation(premise) {
      return premise.replace(/\~+/g,'');
    }

    function _getAssumption(premise) {
      var structure, assumption;
      structure = premise.digest();
      assumption = premise.getAssumption(structure);
      return premise.expand(assumption);
    }

    function _getConclusion(premise) {
      var structure, conclusion, expanded;
      structure = premise.digest();
      conclusion = premise.getConclusion(structure);
      expanded = premise.expand(_removeNegation(conclusion));
      return (premise.hasNegation(conclusion))
      ? '~' + expanded
      : expanded;
    }

    function _getPureConclusion(premise) {
      var structure, conclusion, expanded;
      structure = premise.digest();
      conclusion = premise.getConclusion(structure);
      return premise.expand(_removeNegation(conclusion));
    }

    function _getRawConclusion(premise, structure) {
      var structure, conclusion;
      structure = premise.digest();
      conclusion = premise.getConclusion(structure);
      return conclusion;
    }

});

angular
  .module('logicToolsApp')
  .factory('Premise', function() {

    var NEGATION_REGEX, IMPLICATION_REGEX, id;
    NEGATION_REGEX = /^\~+/;
    IMPLICATION_REGEX = /[=][>]/g;
    id = 0;

  	function Premise(props) {
      this.labels = {};
      this.id = ++id;
      this.scopeLayer = props.scopeLayer;
      this.scopeId = props.scopeId;
      this.value = _removeSpaces(props.value);
  	}

    Premise.prototype.digest = function(callback) {
      var premises, copyPremise, label, labels, value;
      value = this.value;
      premises = [];
      labels = {};
      label = 0;

      while(premises) {
        premises = _breakPremise(value);
        _.each(_extractPremises(value), function(premise) {
          copyPremise = premise.slice();
          labels[++label] = _createLabels(labels, copyPremise);
          value = _reducePremise(value, _unwrap(premise), label);
          if (callback) {
              callback(premise, value, label);
          }
        });
      }
      this.labels = _.assign({}, labels);
      return value;
    }

    Premise.prototype.isImplication = function(structrue) {
  	  var base = structrue || this.value;
      return !!base.match(IMPLICATION_REGEX);
    };
    Premise.prototype.isAnd = function (structrue) {
      var base = structrue || this.value;
      return /[&]/g.exec(base);
    };
    Premise.prototype.isOr = function (structrue) {
      var base = structrue || this.value;
      return /[|]/g.exec(base);
    };
    Premise.prototype.isBicon = function (structrue) {
      var base = structrue || this.value;
      return /[<][=][>]/g.exec(base);
    };
    Premise.prototype.expand = function(premiseLabel) {
      var premise, indexPremise, labels, symbol;
      indexPremise = premiseLabel.replace(NEGATION_REGEX, '');
      labels = this.labels;
      premise = labels[indexPremise] || this.removeNegation(premiseLabel);
      symbol = (this.hasNegation(premiseLabel))
      ? premiseLabel.match(NEGATION_REGEX)[0]
      : '';
      return  symbol + _expandPremise(labels, premise);
    };
    Premise.prototype.getAssumption = function(structrue) {
      var base, splited
      base = structrue || this.value;
      splited = _splitImplication(base);
      return (splited) ? splited[0] : undefined;
    };
    Premise.prototype.getConclusion = function(structrue) {
      var base, splited
      base = structrue || this.value;
      splited = _splitImplication(base);
      return (splited) ? splited[1] : undefined;
    };
    Premise.prototype.getExpandedAssumption = function(structrue) {
      var base, splited
      base = structrue || this.value;
      splited = _splitImplication(base);
      return (splited) ? this.expand(splited[0]) : undefined;
    };
    Premise.prototype.getExpandedConclusion = function(structrue) {
      var base, splited
      base = structrue || this.value;
      splited = _splitImplication(base);
      return (splited) ? this.expand(splited[1]) : undefined;
    };
    Premise.prototype.getPrimitives = function(structrue) {
      var base = structrue || this.value;
      return base.match(/\w+/g);
    }
    Premise.prototype.removeNegation = function(structrue) {
      var base = structrue || this.value;
      return base.replace(NEGATION_REGEX, '');
    }
    Premise.prototype.hasNegation = function(structrue) {
      var base = structrue || this.value;
      return !!base.match(NEGATION_REGEX);
    }
    Premise.prototype.isCompound = function(structrue) {
      var base = structrue || this.value;
      return !!base.match(/[<=>|&]+/);
    }
    Premise.prototype.unwrap = function (value) {
      return _unwrap(value || this.value);
    };

    function _breakPremise(value) {
      return value.match(/[(]{1}[\w~<=>|&]+(?=[)]{1})[)]{1}/g);
    }

    function _createLabels (labels, premise) {
      var createdLabels;
      createdLabels = _.keys(labels);
      return Array.prototype.map.call(premise, function(val, k) {
          return (createdLabels.indexOf(val) !== -1) ? labels[val] : val;
      }).join('');
    }

    function _extractPremises(premise) {
      return (_breakPremise(premise)) ? _breakPremise(premise) : [premise];
    }

    function _reducePremise(premise, subPremise, label) {
      var matchExpr;
      subPremise = subPremise.replace(/[|]/g, '[|]'); //This is special for the 'or' character.
      matchExpr = new RegExp('[(]' + subPremise + '[)]', 'g');
      return premise.replace(matchExpr, label);
    }

    function _expandPremise(labels, value) {
      var premiseValue, labelsKeys, symbol;
      premiseValue = value.slice();
      labelsKeys = _.keys(labels);
      return _.map(labelsKeys, function(label) {
                premiseValue = premiseValue.replace(label, labels[label]);
                return premiseValue;
            }).slice(-1)[0];
    }

    function _splitImplication(value) {
        return value.split(IMPLICATION_REGEX);
    }

    function _unwrap(value) {
      var unwraped;
      if (!value) {
        return undefined;
      }
      unwraped = value.match(/[(]{1}([\w\W]+)[)]{1}/);
      return (unwraped) ? unwraped[1] : value;
    }

    function _removeSpaces(value) {
      return value.replace(/\s+/g,'');
    }

    return {
      new: function(props) {
        return new Premise(props);
      }
    }

  });

'use strict';

angular
  .module('logicToolsApp')
  .service('tableGenerator', function(Premise, Table) {

    var basePremise, table;
    this.generate = function(premise) {
      var premises, atomicPremises;
      premises = [];
      this.premise = premise;
      basePremise = Premise.new({
          value: premise
      });
      table = Table.new();
      reset.call(this);
      atomicPremises = _getAtomicPremises(premise);
      this.value = _buildAtomicColumn(atomicPremises);
      this.value = _.assign({}, this.value, _buildCompoundColumn(this.value));
      this.labels = basePremise.labels;
    };

    function reset() {
      this.value = {};
      this.labels = {};
    }

    reset.call(this);

    function _getAtomicPremises(premise) {
      return _.uniq(premise.match(/[^~<=>()&|\s]/g));
    }
    function _buildAtomicValues(value, key) {
      var columns, column, rows;
      columns = _.keys(value);
      rows = Math.pow(2, columns.length);
      column = 0;
      return _.mapValues(value, function (value, key) {
        return table.getAtomicValue(++column, rows);
      });
    }
    function _buildAtomicColumn(atomicPremises) {
      var initialPremises, premisesValues;
      initialPremises = {};
      _.forEach(atomicPremises, function (premise, key) {
          initialPremises[premise] = [];
          premisesValues = _buildAtomicValues(initialPremises, key);
      });
      return premisesValues;
    }
    function _buildCompoundColumn(tableValue) {
      var values;
      values = _.assign({}, tableValue);
      basePremise.digest(function(premise, value, label) {
          values[label] = table.getCompoundValue(premise, label, values);
      });
      return values;
    }
  });

angular
  .module('logicToolsApp')
  .factory('Table', function(formula) {

    function Table () {}

    Table.prototype.getCompoundValue = function(premise, key, tableValue) {
      var ca, cb, c, a, b, getFormula, atomics, values;
      getFormula = formula.resultFn(premise);
      atomics = premise.match(/\w+|[~]+\w|\d+|[~]+\d/g);
      values = [];
      ca = _negateColumn(tableValue, atomics[0]);
      cb = _negateColumn(tableValue, atomics[1]);
      c = 0;
      while (ca.length > c) {
          a = ca[c];
          b = cb[c];
          values.push(Number(getFormula(a, b)));
          c++;
      }
      return values;
    }

    Table.prototype.getAtomicValue = function(nCol, nRows) {
      var values, value, row, nchange, sumup;
      values = [];
      value = 0;
      row = 1;
      sumup = 1;
      nchange = Math.pow(2, nCol);
      while (row <= nRows) {
          if (((1 / nchange) * nRows) * sumup < row) {
              value = 1 - value;
              sumup++;
          }
          values.push(value);
          row++;
      }
      return values;
    }

    function _negateColumn(value, premise) {
      /*Negate if negation exists*/
      var negation, result, atomic, operator;
      negation = premise.match(/[~]/g);
      atomic = premise.match(/\w+/g);
      if (negation) {
          result = _.map(value[atomic[0]], function(val, key) {
              operator = negation.join('').replace(/[~]/g, '!');
              return Number(eval(operator + val));
          });
      } else {
          result = value[atomic[0]];
      }
      return result;
    }

		return {
			new: function() {
				return new Table();
			}
		}

  });

//# sourceMappingURL=maps/base.js.map