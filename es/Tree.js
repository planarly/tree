import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import _objectSpread from "@babel/runtime/helpers/esm/objectSpread2";
import _toConsumableArray from "@babel/runtime/helpers/esm/toConsumableArray";
import _classCallCheck from "@babel/runtime/helpers/esm/classCallCheck";
import _createClass from "@babel/runtime/helpers/esm/createClass";
import _inherits from "@babel/runtime/helpers/esm/inherits";
import _createSuper from "@babel/runtime/helpers/esm/createSuper";
// TODO: https://www.w3.org/TR/2017/NOTE-wai-aria-practices-1.1-20171214/examples/treeview/treeview-2/treeview-2a.html
// Fully accessibility support
import * as React from 'react';
import KeyCode from "rc-util/es/KeyCode";
import warning from "rc-util/es/warning";
import classNames from 'classnames';
import { TreeContext } from './contextTypes';
import { getDataAndAria, getDragNodesKeys, parseCheckedKeys, conductExpandParent, calcSelectedKeys, calcDropPosition, arrAdd, arrDel, posToArr } from './util';
import { flattenTreeData, convertTreeToData, convertDataToEntities, warningWithoutKey, convertNodePropsToEventData, getTreeNodeProps } from './utils/treeUtil';
import NodeList, { MOTION_KEY, MotionEntity } from './NodeList';
import TreeNode from './TreeNode';
import { conductCheck } from './utils/conductUtil';

var Tree = /*#__PURE__*/function (_React$Component) {
  _inherits(Tree, _React$Component);

  var _super = _createSuper(Tree);

  function Tree() {
    var _this;

    _classCallCheck(this, Tree);

    _this = _super.apply(this, arguments);
    _this.state = {
      keyEntities: {},
      selectedKeys: [],
      checkedKeys: [],
      halfCheckedKeys: [],
      loadedKeys: [],
      loadingKeys: [],
      expandedKeys: [],
      dragging: false,
      dragNodesKeys: [],
      dragOverNodeKey: null,
      dropPosition: null,
      treeData: [],
      flattenNodes: [],
      focused: false,
      activeKey: null,
      listChanging: false,
      prevProps: null
    };
    _this.listRef = React.createRef();

    _this.onNodeDragStart = function (event, node) {
      var _this$state = _this.state,
          expandedKeys = _this$state.expandedKeys,
          keyEntities = _this$state.keyEntities;
      var onDragStart = _this.props.onDragStart;
      var eventKey = node.props.eventKey;
      _this.dragNode = node;
      var newExpandedKeys = arrDel(expandedKeys, eventKey);

      _this.setState({
        dragging: true,
        dragNodesKeys: getDragNodesKeys(eventKey, keyEntities)
      });

      _this.setExpandedKeys(newExpandedKeys);

      if (onDragStart) {
        onDragStart({
          event: event,
          node: convertNodePropsToEventData(node.props)
        });
      }
    };
    /**
     * [Legacy] Select handler is less small than node,
     * so that this will trigger when drag enter node or select handler.
     * This is a little tricky if customize css without padding.
     * Better for use mouse move event to refresh drag state.
     * But let's just keep it to avoid event trigger logic change.
     */


    _this.onNodeDragEnter = function (event, node) {
      var _this$state2 = _this.state,
          expandedKeys = _this$state2.expandedKeys,
          keyEntities = _this$state2.keyEntities,
          dragNodesKeys = _this$state2.dragNodesKeys;
      var onDragEnter = _this.props.onDragEnter;
      var _node$props = node.props,
          pos = _node$props.pos,
          eventKey = _node$props.eventKey;
      if (!_this.dragNode || dragNodesKeys.indexOf(eventKey) !== -1) return;
      var dropPosition = calcDropPosition(event, node); // Skip if drag node is self

      if (_this.dragNode.props.eventKey === eventKey && dropPosition === 0) {
        _this.setState({
          dragOverNodeKey: '',
          dropPosition: null
        });

        return;
      } // Ref: https://github.com/react-component/tree/issues/132
      // Add timeout to let onDragLevel fire before onDragEnter,
      // so that we can clean drag props for onDragLeave node.
      // Macro task for this:
      // https://html.spec.whatwg.org/multipage/webappapis.html#clean-up-after-running-script


      setTimeout(function () {
        // Update drag over node
        _this.setState({
          dragOverNodeKey: eventKey,
          dropPosition: dropPosition
        }); // Side effect for delay drag


        if (!_this.delayedDragEnterLogic) {
          _this.delayedDragEnterLogic = {};
        }

        Object.keys(_this.delayedDragEnterLogic).forEach(function (key) {
          clearTimeout(_this.delayedDragEnterLogic[key]);
        });
        _this.delayedDragEnterLogic[pos] = window.setTimeout(function () {
          if (!_this.state.dragging) return;

          var newExpandedKeys = _toConsumableArray(expandedKeys);

          var entity = keyEntities[eventKey];

          if (entity && (entity.children || []).length) {
            newExpandedKeys = arrAdd(expandedKeys, eventKey);
          }

          if (!('expandedKeys' in _this.props)) {
            _this.setExpandedKeys(newExpandedKeys);
          }

          if (onDragEnter) {
            onDragEnter({
              event: event,
              node: convertNodePropsToEventData(node.props),
              expandedKeys: newExpandedKeys
            });
          }
        }, 400);
      }, 0);
    };

    _this.onNodeDragOver = function (event, node) {
      var dragNodesKeys = _this.state.dragNodesKeys;
      var onDragOver = _this.props.onDragOver;
      var eventKey = node.props.eventKey;

      if (dragNodesKeys.indexOf(eventKey) !== -1) {
        return;
      } // Update drag position


      if (_this.dragNode && eventKey === _this.state.dragOverNodeKey) {
        var dropPosition = calcDropPosition(event, node);
        if (dropPosition === _this.state.dropPosition) return;

        _this.setState({
          dropPosition: dropPosition
        });
      }

      if (onDragOver) {
        onDragOver({
          event: event,
          node: convertNodePropsToEventData(node.props)
        });
      }
    };

    _this.onNodeDragLeave = function (event, node) {
      var onDragLeave = _this.props.onDragLeave;

      _this.setState({
        dragOverNodeKey: ''
      });

      if (onDragLeave) {
        onDragLeave({
          event: event,
          node: convertNodePropsToEventData(node.props)
        });
      }
    };

    _this.onNodeDragEnd = function (event, node) {
      var onDragEnd = _this.props.onDragEnd;

      _this.setState({
        dragOverNodeKey: ''
      });

      _this.cleanDragState();

      if (onDragEnd) {
        onDragEnd({
          event: event,
          node: convertNodePropsToEventData(node.props)
        });
      }

      _this.dragNode = null;
    };

    _this.onNodeDrop = function (event, node) {
      var _this$state3 = _this.state,
          _this$state3$dragNode = _this$state3.dragNodesKeys,
          dragNodesKeys = _this$state3$dragNode === void 0 ? [] : _this$state3$dragNode,
          dropPosition = _this$state3.dropPosition;
      var onDrop = _this.props.onDrop;
      var _node$props2 = node.props,
          eventKey = _node$props2.eventKey,
          pos = _node$props2.pos;

      _this.setState({
        dragOverNodeKey: ''
      });

      _this.cleanDragState();

      if (dragNodesKeys.indexOf(eventKey) !== -1) {
        warning(false, "Can not drop to dragNode(include it's children node)");
        return;
      }

      var posArr = posToArr(pos);
      var dropResult = {
        event: event,
        node: convertNodePropsToEventData(node.props),
        dragNode: _this.dragNode ? convertNodePropsToEventData(_this.dragNode.props) : null,
        dragNodesKeys: dragNodesKeys.slice(),
        dropPosition: dropPosition + Number(posArr[posArr.length - 1]),
        dropToGap: false
      };

      if (dropPosition !== 0) {
        dropResult.dropToGap = true;
      }

      if (onDrop) {
        onDrop(dropResult);
      }

      _this.dragNode = null;
    };

    _this.cleanDragState = function () {
      var dragging = _this.state.dragging;

      if (dragging) {
        _this.setState({
          dragging: false
        });
      }
    };

    _this.onNodeClick = function (e, treeNode) {
      var onClick = _this.props.onClick;

      if (onClick) {
        onClick(e, treeNode);
      }
    };

    _this.onNodeDoubleClick = function (e, treeNode) {
      var onDoubleClick = _this.props.onDoubleClick;

      if (onDoubleClick) {
        onDoubleClick(e, treeNode);
      }
    };

    _this.onNodeSelect = function (e, treeNode) {
      var selectedKeys = _this.state.selectedKeys;
      var keyEntities = _this.state.keyEntities;
      var _this$props = _this.props,
          onSelect = _this$props.onSelect,
          multiple = _this$props.multiple;
      var selected = treeNode.selected,
          key = treeNode.key;
      var targetSelected = !selected; // Update selected keys

      if (!targetSelected) {
        selectedKeys = arrDel(selectedKeys, key);
      } else if (!multiple) {
        selectedKeys = [key];
      } else {
        selectedKeys = arrAdd(selectedKeys, key);
      } // [Legacy] Not found related usage in doc or upper libs


      var selectedNodes = selectedKeys.map(function (selectedKey) {
        var entity = keyEntities[selectedKey];
        if (!entity) return null;
        return entity.node;
      }).filter(function (node) {
        return node;
      });

      _this.setUncontrolledState({
        selectedKeys: selectedKeys
      });

      if (onSelect) {
        onSelect(selectedKeys, {
          event: 'select',
          selected: targetSelected,
          node: treeNode,
          selectedNodes: selectedNodes,
          nativeEvent: e.nativeEvent
        });
      }
    };

    _this.onNodeCheck = function (e, treeNode, checked) {
      var _this$state4 = _this.state,
          keyEntities = _this$state4.keyEntities,
          oriCheckedKeys = _this$state4.checkedKeys,
          oriHalfCheckedKeys = _this$state4.halfCheckedKeys;
      var _this$props2 = _this.props,
          checkStrictly = _this$props2.checkStrictly,
          onCheck = _this$props2.onCheck;
      var key = treeNode.key; // Prepare trigger arguments

      var checkedObj;
      var eventObj = {
        event: 'check',
        node: treeNode,
        checked: checked,
        nativeEvent: e.nativeEvent
      };

      if (checkStrictly) {
        var checkedKeys = checked ? arrAdd(oriCheckedKeys, key) : arrDel(oriCheckedKeys, key);
        var halfCheckedKeys = arrDel(oriHalfCheckedKeys, key);
        checkedObj = {
          checked: checkedKeys,
          halfChecked: halfCheckedKeys
        };
        eventObj.checkedNodes = checkedKeys.map(function (checkedKey) {
          return keyEntities[checkedKey];
        }).filter(function (entity) {
          return entity;
        }).map(function (entity) {
          return entity.node;
        });

        _this.setUncontrolledState({
          checkedKeys: checkedKeys
        });
      } else {
        // Always fill first
        var _conductCheck = conductCheck([].concat(_toConsumableArray(oriCheckedKeys), [key]), true, keyEntities),
            _checkedKeys = _conductCheck.checkedKeys,
            _halfCheckedKeys = _conductCheck.halfCheckedKeys; // If remove, we do it again to correction


        if (!checked) {
          var keySet = new Set(_checkedKeys);
          keySet.delete(key);

          var _conductCheck2 = conductCheck(Array.from(keySet), {
            checked: false,
            halfCheckedKeys: _halfCheckedKeys
          }, keyEntities);

          _checkedKeys = _conductCheck2.checkedKeys;
          _halfCheckedKeys = _conductCheck2.halfCheckedKeys;
        }

        checkedObj = _checkedKeys; // [Legacy] This is used for `rc-tree-select`

        eventObj.checkedNodes = [];
        eventObj.checkedNodesPositions = [];
        eventObj.halfCheckedKeys = _halfCheckedKeys;

        _checkedKeys.forEach(function (checkedKey) {
          var entity = keyEntities[checkedKey];
          if (!entity) return;
          var node = entity.node,
              pos = entity.pos;
          eventObj.checkedNodes.push(node);
          eventObj.checkedNodesPositions.push({
            node: node,
            pos: pos
          });
        });

        _this.setUncontrolledState({
          checkedKeys: _checkedKeys
        }, false, {
          halfCheckedKeys: _halfCheckedKeys
        });
      }

      if (onCheck) {
        onCheck(checkedObj, eventObj);
      }
    };

    _this.onNodeLoad = function (treeNode) {
      return new Promise(function (resolve) {
        // We need to get the latest state of loading/loaded keys
        _this.setState(function (_ref) {
          var _ref$loadedKeys = _ref.loadedKeys,
              loadedKeys = _ref$loadedKeys === void 0 ? [] : _ref$loadedKeys,
              _ref$loadingKeys = _ref.loadingKeys,
              loadingKeys = _ref$loadingKeys === void 0 ? [] : _ref$loadingKeys;
          var _this$props3 = _this.props,
              loadData = _this$props3.loadData,
              onLoad = _this$props3.onLoad;
          var key = treeNode.key;

          if (!loadData || loadedKeys.indexOf(key) !== -1 || loadingKeys.indexOf(key) !== -1) {
            // react 15 will warn if return null
            return {};
          } // Process load data


          var promise = loadData(treeNode);
          promise.then(function () {
            var _this$state5 = _this.state,
                currentLoadedKeys = _this$state5.loadedKeys,
                currentLoadingKeys = _this$state5.loadingKeys;
            var newLoadedKeys = arrAdd(currentLoadedKeys, key);
            var newLoadingKeys = arrDel(currentLoadingKeys, key); // onLoad should trigger before internal setState to avoid `loadData` trigger twice.
            // https://github.com/ant-design/ant-design/issues/12464

            if (onLoad) {
              onLoad(newLoadedKeys, {
                event: 'load',
                node: treeNode
              });
            }

            _this.setUncontrolledState({
              loadedKeys: newLoadedKeys
            });

            _this.setState({
              loadingKeys: newLoadingKeys
            });

            resolve();
          });
          return {
            loadingKeys: arrAdd(loadingKeys, key)
          };
        });
      });
    };

    _this.onNodeMouseEnter = function (event, node) {
      var onMouseEnter = _this.props.onMouseEnter;

      if (onMouseEnter) {
        onMouseEnter({
          event: event,
          node: node
        });
      }
    };

    _this.onNodeMouseLeave = function (event, node) {
      var onMouseLeave = _this.props.onMouseLeave;

      if (onMouseLeave) {
        onMouseLeave({
          event: event,
          node: node
        });
      }
    };

    _this.onNodeContextMenu = function (event, node) {
      var onRightClick = _this.props.onRightClick;

      if (onRightClick) {
        event.preventDefault();
        onRightClick({
          event: event,
          node: node
        });
      }
    };

    _this.onFocus = function () {
      var onFocus = _this.props.onFocus;

      _this.setState({
        focused: true
      });

      if (onFocus) {
        onFocus.apply(void 0, arguments);
      }
    };

    _this.onBlur = function () {
      var onBlur = _this.props.onBlur;

      _this.setState({
        focused: false
      });

      _this.onActiveChange(null);

      if (onBlur) {
        onBlur.apply(void 0, arguments);
      }
    };

    _this.getTreeNodeRequiredProps = function () {
      var _this$state6 = _this.state,
          expandedKeys = _this$state6.expandedKeys,
          selectedKeys = _this$state6.selectedKeys,
          loadedKeys = _this$state6.loadedKeys,
          loadingKeys = _this$state6.loadingKeys,
          checkedKeys = _this$state6.checkedKeys,
          halfCheckedKeys = _this$state6.halfCheckedKeys,
          dragOverNodeKey = _this$state6.dragOverNodeKey,
          dropPosition = _this$state6.dropPosition,
          keyEntities = _this$state6.keyEntities;
      return {
        expandedKeys: expandedKeys || [],
        selectedKeys: selectedKeys || [],
        loadedKeys: loadedKeys || [],
        loadingKeys: loadingKeys || [],
        checkedKeys: checkedKeys || [],
        halfCheckedKeys: halfCheckedKeys || [],
        dragOverNodeKey: dragOverNodeKey,
        dropPosition: dropPosition,
        keyEntities: keyEntities
      };
    }; // =========================== Expanded ===========================

    /** Set uncontrolled `expandedKeys`. This will also auto update `flattenNodes`. */


    _this.setExpandedKeys = function (expandedKeys) {
      var treeData = _this.state.treeData;
      var flattenNodes = flattenTreeData(treeData, expandedKeys);

      _this.setUncontrolledState({
        expandedKeys: expandedKeys,
        flattenNodes: flattenNodes
      }, true);
    };

    _this.onNodeExpand = function (e, treeNode) {
      var expandedKeys = _this.state.expandedKeys;
      var listChanging = _this.state.listChanging;
      var _this$props4 = _this.props,
          onExpand = _this$props4.onExpand,
          loadData = _this$props4.loadData;
      var key = treeNode.key,
          expanded = treeNode.expanded; // Do nothing when motion is in progress

      if (listChanging) {
        return;
      } // Update selected keys


      var index = expandedKeys.indexOf(key);
      var targetExpanded = !expanded;
      warning(expanded && index !== -1 || !expanded && index === -1, 'Expand state not sync with index check');

      if (targetExpanded) {
        expandedKeys = arrAdd(expandedKeys, key);
      } else {
        expandedKeys = arrDel(expandedKeys, key);
      }

      _this.setExpandedKeys(expandedKeys);

      if (onExpand) {
        onExpand(expandedKeys, {
          node: treeNode,
          expanded: targetExpanded,
          nativeEvent: e.nativeEvent
        });
      } // Async Load data


      if (targetExpanded && loadData) {
        var loadPromise = _this.onNodeLoad(treeNode);

        if (loadPromise) {
          loadPromise.then(function () {
            // [Legacy] Refresh logic
            var newFlattenTreeData = flattenTreeData(_this.state.treeData, expandedKeys);

            _this.setUncontrolledState({
              flattenNodes: newFlattenTreeData
            });
          });
        }
      }
    };

    _this.onListChangeStart = function () {
      _this.setUncontrolledState({
        listChanging: true
      });
    };

    _this.onListChangeEnd = function () {
      setTimeout(function () {
        _this.setUncontrolledState({
          listChanging: false
        });
      });
    }; // =========================== Keyboard ===========================


    _this.onActiveChange = function (newActiveKey) {
      var activeKey = _this.state.activeKey;
      var onActiveChange = _this.props.onActiveChange;

      if (activeKey === newActiveKey) {
        return;
      }

      _this.setState({
        activeKey: newActiveKey
      });

      if (newActiveKey !== null) {
        _this.scrollTo({
          key: newActiveKey
        });
      }

      if (onActiveChange) {
        onActiveChange(newActiveKey);
      }
    };

    _this.getActiveItem = function () {
      var _this$state7 = _this.state,
          activeKey = _this$state7.activeKey,
          flattenNodes = _this$state7.flattenNodes;

      if (activeKey === null) {
        return null;
      }

      return flattenNodes.find(function (_ref2) {
        var key = _ref2.data.key;
        return key === activeKey;
      }) || null;
    };

    _this.offsetActiveKey = function (offset) {
      var _this$state8 = _this.state,
          flattenNodes = _this$state8.flattenNodes,
          activeKey = _this$state8.activeKey;
      var index = flattenNodes.findIndex(function (_ref3) {
        var key = _ref3.data.key;
        return key === activeKey;
      }); // Align with index

      if (index === -1 && offset < 0) {
        index = flattenNodes.length;
      }

      index = (index + offset + flattenNodes.length) % flattenNodes.length;
      var item = flattenNodes[index];

      if (item) {
        var key = item.data.key;

        _this.onActiveChange(key);
      } else {
        _this.onActiveChange(null);
      }
    };

    _this.onKeyDown = function (event) {
      var _this$state9 = _this.state,
          activeKey = _this$state9.activeKey,
          expandedKeys = _this$state9.expandedKeys,
          checkedKeys = _this$state9.checkedKeys;
      var _this$props5 = _this.props,
          onKeyDown = _this$props5.onKeyDown,
          checkable = _this$props5.checkable,
          selectable = _this$props5.selectable; // >>>>>>>>>> Direction

      switch (event.which) {
        case KeyCode.UP:
          {
            _this.offsetActiveKey(-1);

            event.preventDefault();
            break;
          }

        case KeyCode.DOWN:
          {
            _this.offsetActiveKey(1);

            event.preventDefault();
            break;
          }
      } // >>>>>>>>>> Expand & Selection


      var activeItem = _this.getActiveItem();

      if (activeItem && activeItem.data) {
        var treeNodeRequiredProps = _this.getTreeNodeRequiredProps();

        var expandable = activeItem.data.isLeaf === false || !!(activeItem.data.children || []).length;
        var eventNode = convertNodePropsToEventData(_objectSpread(_objectSpread({}, getTreeNodeProps(activeKey, treeNodeRequiredProps)), {}, {
          data: activeItem.data,
          active: true
        }));

        switch (event.which) {
          // >>> Expand
          case KeyCode.LEFT:
            {
              // Collapse if possible
              if (expandable && expandedKeys.includes(activeKey)) {
                _this.onNodeExpand({}, eventNode);
              } else if (activeItem.parent) {
                _this.onActiveChange(activeItem.parent.data.key);
              }

              event.preventDefault();
              break;
            }

          case KeyCode.RIGHT:
            {
              // Expand if possible
              if (expandable && !expandedKeys.includes(activeKey)) {
                _this.onNodeExpand({}, eventNode);
              } else if (activeItem.children && activeItem.children.length) {
                _this.onActiveChange(activeItem.children[0].data.key);
              }

              event.preventDefault();
              break;
            }
          // Selection

          case KeyCode.ENTER:
          case KeyCode.SPACE:
            {
              if (checkable && !eventNode.disabled && eventNode.checkable !== false && !eventNode.disableCheckbox) {
                _this.onNodeCheck({}, eventNode, !checkedKeys.includes(activeKey));
              } else if (!checkable && selectable && !eventNode.disabled && eventNode.selectable !== false) {
                _this.onNodeSelect({}, eventNode);
              }

              break;
            }
        }
      }

      if (onKeyDown) {
        onKeyDown(event);
      }
    };
    /**
     * Only update the value which is not in props
     */


    _this.setUncontrolledState = function (state) {
      var atomic = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      var forceState = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
      var needSync = false;
      var allPassed = true;
      var newState = {};
      Object.keys(state).forEach(function (name) {
        if (name in _this.props) {
          allPassed = false;
          return;
        }

        needSync = true;
        newState[name] = state[name];
      });

      if (needSync && (!atomic || allPassed)) {
        _this.setState(_objectSpread(_objectSpread({}, newState), forceState));
      }
    };

    _this.scrollTo = function (scroll) {
      _this.listRef.current.scrollTo(scroll);
    };

    return _this;
  }

  _createClass(Tree, [{
    key: "render",
    value: function render() {
      var _classNames;

      var _this$state10 = this.state,
          focused = _this$state10.focused,
          flattenNodes = _this$state10.flattenNodes,
          keyEntities = _this$state10.keyEntities,
          dragging = _this$state10.dragging,
          activeKey = _this$state10.activeKey;
      var _this$props6 = this.props,
          prefixCls = _this$props6.prefixCls,
          className = _this$props6.className,
          style = _this$props6.style,
          showLine = _this$props6.showLine,
          focusable = _this$props6.focusable,
          _this$props6$tabIndex = _this$props6.tabIndex,
          tabIndex = _this$props6$tabIndex === void 0 ? 0 : _this$props6$tabIndex,
          selectable = _this$props6.selectable,
          showIcon = _this$props6.showIcon,
          icon = _this$props6.icon,
          switcherIcon = _this$props6.switcherIcon,
          draggable = _this$props6.draggable,
          checkable = _this$props6.checkable,
          checkStrictly = _this$props6.checkStrictly,
          disabled = _this$props6.disabled,
          motion = _this$props6.motion,
          loadData = _this$props6.loadData,
          filterTreeNode = _this$props6.filterTreeNode,
          height = _this$props6.height,
          itemHeight = _this$props6.itemHeight,
          virtual = _this$props6.virtual,
          titleRender = _this$props6.titleRender;
      var domProps = getDataAndAria(this.props);
      return React.createElement(TreeContext.Provider, {
        value: {
          prefixCls: prefixCls,
          selectable: selectable,
          showIcon: showIcon,
          icon: icon,
          switcherIcon: switcherIcon,
          draggable: draggable,
          checkable: checkable,
          checkStrictly: checkStrictly,
          disabled: disabled,
          keyEntities: keyEntities,
          loadData: loadData,
          filterTreeNode: filterTreeNode,
          titleRender: titleRender,
          onNodeClick: this.onNodeClick,
          onNodeDoubleClick: this.onNodeDoubleClick,
          onNodeExpand: this.onNodeExpand,
          onNodeSelect: this.onNodeSelect,
          onNodeCheck: this.onNodeCheck,
          onNodeLoad: this.onNodeLoad,
          onNodeMouseEnter: this.onNodeMouseEnter,
          onNodeMouseLeave: this.onNodeMouseLeave,
          onNodeContextMenu: this.onNodeContextMenu,
          onNodeDragStart: this.onNodeDragStart,
          onNodeDragEnter: this.onNodeDragEnter,
          onNodeDragOver: this.onNodeDragOver,
          onNodeDragLeave: this.onNodeDragLeave,
          onNodeDragEnd: this.onNodeDragEnd,
          onNodeDrop: this.onNodeDrop
        }
      }, React.createElement("div", {
        className: classNames(prefixCls, className, (_classNames = {}, _defineProperty(_classNames, "".concat(prefixCls, "-show-line"), showLine), _defineProperty(_classNames, "".concat(prefixCls, "-focused"), focused), _defineProperty(_classNames, "".concat(prefixCls, "-active-focused"), activeKey !== null), _classNames))
      }, React.createElement(NodeList, Object.assign({
        ref: this.listRef,
        prefixCls: prefixCls,
        style: style,
        data: flattenNodes,
        disabled: disabled,
        selectable: selectable,
        checkable: !!checkable,
        motion: motion,
        dragging: dragging,
        height: height,
        itemHeight: itemHeight,
        virtual: virtual,
        focusable: focusable,
        focused: focused,
        tabIndex: tabIndex,
        activeItem: this.getActiveItem(),
        onFocus: this.onFocus,
        onBlur: this.onBlur,
        onKeyDown: this.onKeyDown,
        onActiveChange: this.onActiveChange,
        onListChangeStart: this.onListChangeStart,
        onListChangeEnd: this.onListChangeEnd
      }, this.getTreeNodeRequiredProps(), domProps))));
    }
  }], [{
    key: "getDerivedStateFromProps",
    value: function getDerivedStateFromProps(props, prevState) {
      var prevProps = prevState.prevProps;
      var newState = {
        prevProps: props
      };

      function needSync(name) {
        return !prevProps && name in props || prevProps && prevProps[name] !== props[name];
      } // ================== Tree Node ==================


      var treeData; // Check if `treeData` or `children` changed and save into the state.

      if (needSync('treeData')) {
        treeData = props.treeData;
      } else if (needSync('children')) {
        warning(false, '`children` of Tree is deprecated. Please use `treeData` instead.');
        treeData = convertTreeToData(props.children);
      } // Save flatten nodes info and convert `treeData` into keyEntities


      if (treeData) {
        newState.treeData = treeData;
        var entitiesMap = convertDataToEntities(treeData);
        newState.keyEntities = _objectSpread(_defineProperty({}, MOTION_KEY, MotionEntity), entitiesMap.keyEntities); // Warning if treeNode not provide key

        if (process.env.NODE_ENV !== 'production') {
          warningWithoutKey(treeData);
        }
      }

      var keyEntities = newState.keyEntities || prevState.keyEntities; // ================ expandedKeys =================

      if (needSync('expandedKeys') || prevProps && needSync('autoExpandParent')) {
        newState.expandedKeys = props.autoExpandParent || !prevProps && props.defaultExpandParent ? conductExpandParent(props.expandedKeys, keyEntities) : props.expandedKeys;
      } else if (!prevProps && props.defaultExpandAll) {
        var cloneKeyEntities = _objectSpread({}, keyEntities);

        delete cloneKeyEntities[MOTION_KEY];
        newState.expandedKeys = Object.keys(cloneKeyEntities).map(function (key) {
          return cloneKeyEntities[key].key;
        });
      } else if (!prevProps && props.defaultExpandedKeys) {
        newState.expandedKeys = props.autoExpandParent || props.defaultExpandParent ? conductExpandParent(props.defaultExpandedKeys, keyEntities) : props.defaultExpandedKeys;
      }

      if (!newState.expandedKeys) {
        delete newState.expandedKeys;
      } // ================ flattenNodes =================


      if (treeData || newState.expandedKeys) {
        var flattenNodes = flattenTreeData(treeData || prevState.treeData, newState.expandedKeys || prevState.expandedKeys);
        newState.flattenNodes = flattenNodes;
      } // ================ selectedKeys =================


      if (props.selectable) {
        if (needSync('selectedKeys')) {
          newState.selectedKeys = calcSelectedKeys(props.selectedKeys, props);
        } else if (!prevProps && props.defaultSelectedKeys) {
          newState.selectedKeys = calcSelectedKeys(props.defaultSelectedKeys, props);
        }
      } // ================= checkedKeys =================


      if (props.checkable) {
        var checkedKeyEntity;

        if (needSync('checkedKeys')) {
          checkedKeyEntity = parseCheckedKeys(props.checkedKeys) || {};
        } else if (!prevProps && props.defaultCheckedKeys) {
          checkedKeyEntity = parseCheckedKeys(props.defaultCheckedKeys) || {};
        } else if (treeData) {
          // If `treeData` changed, we also need check it
          checkedKeyEntity = parseCheckedKeys(props.checkedKeys) || {
            checkedKeys: prevState.checkedKeys,
            halfCheckedKeys: prevState.halfCheckedKeys
          };
        }

        if (checkedKeyEntity) {
          var _checkedKeyEntity = checkedKeyEntity,
              _checkedKeyEntity$che = _checkedKeyEntity.checkedKeys,
              checkedKeys = _checkedKeyEntity$che === void 0 ? [] : _checkedKeyEntity$che,
              _checkedKeyEntity$hal = _checkedKeyEntity.halfCheckedKeys,
              halfCheckedKeys = _checkedKeyEntity$hal === void 0 ? [] : _checkedKeyEntity$hal;

          if (!props.checkStrictly) {
            var conductKeys = conductCheck(checkedKeys, true, keyEntities);
            checkedKeys = conductKeys.checkedKeys;
            halfCheckedKeys = conductKeys.halfCheckedKeys;
          }

          newState.checkedKeys = checkedKeys;
          newState.halfCheckedKeys = halfCheckedKeys;
        }
      } // ================= loadedKeys ==================


      if (needSync('loadedKeys')) {
        newState.loadedKeys = props.loadedKeys;
      }

      return newState;
    }
  }]);

  return Tree;
}(React.Component);

Tree.defaultProps = {
  prefixCls: 'rc-tree',
  showLine: false,
  showIcon: true,
  selectable: true,
  multiple: false,
  checkable: false,
  disabled: false,
  checkStrictly: false,
  draggable: false,
  defaultExpandParent: true,
  autoExpandParent: false,
  defaultExpandAll: false,
  defaultExpandedKeys: [],
  defaultCheckedKeys: [],
  defaultSelectedKeys: []
};
Tree.TreeNode = TreeNode;
export default Tree;