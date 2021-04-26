import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { ViewPropTypes } from './config'
import Animated, { Easing } from 'react-native-reanimated'

export default class Collapsible extends Component {
  static propTypes = {
    children: PropTypes.node,
    collapsed: PropTypes.bool,
    duration: PropTypes.number,
    style: ViewPropTypes.style,
    onAnimationEnd: PropTypes.func,
    collapsedHeight: PropTypes.number,
    enablePointerEvents: PropTypes.bool,
    align: PropTypes.oneOf(['top', 'center', 'bottom']),
    easing: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  }

  static defaultProps = {
    align: 'top',
    duration: 120,
    collapsed: true,
    collapsedHeight: 0,
    easing: 'easeOutCubic',
    enablePointerEvents: false,
    onAnimationEnd: () => null,
  }

  constructor(props) {
    super(props)
    this.state = {
      measured: false,
      animating: false,
      measuring: false,
      contentHeight: 0,
      height: new Animated.Value(props.collapsedHeight),
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.collapsed !== this.props.collapsed) {
      this.setState({ measured: false }, () => this._componentDidUpdate(prevProps))
    } else {
      this._componentDidUpdate(prevProps)
    }
  }

  componentWillUnmount() {
    this.unmounted = true
  }

  _componentDidUpdate(prevProps) {
    if (prevProps.collapsed !== this.props.collapsed) {
      this._toggleCollapsed(this.props.collapsed)
    } else if (this.props.collapsed && prevProps.collapsedHeight !== this.props.collapsedHeight) {
      this.state.height.setValue(this.props.collapsedHeight)
    }
  }

  contentHandle = null

  _handleRef = ref => {
    this.contentHandle = ref
  }

  _measureContent(callback) {
    this.setState(
      {
        measuring: true,
      },
      () => {
        requestAnimationFrame(() => {
          if (!this.contentHandle) {
            this.setState(
              {
                measuring: false,
              },
              () => callback(this.props.collapsedHeight),
            )
          } else {
            this.contentHandle.getNode().measure((x, y, width, height) => {
              this.setState(
                {
                  measuring: false,
                  measured: true,
                  contentHeight: height,
                },
                () => callback(height),
              )
            })
          }
        })
      },
    )
  }

  _toggleCollapsed(collapsed) {
    if (collapsed) {
      this._transitionToHeight(this.props.collapsedHeight)
    } else if (!this.contentHandle) {
      if (this.state.measured) {
        this._transitionToHeight(this.state.contentHeight)
      }
      return
    } else {
      this._measureContent(contentHeight => {
        this._transitionToHeight(contentHeight)
      })
    }
  }

  _transitionToHeight(height) {
    const config = {
      toValue: height,
      duration: 150,
      easing: Easing.inOut(Easing.ease),
    }

    const config2 = {
      toValue: 0,
      duration: 150,
      easing: Easing.inOut(Easing.ease),
    }

    this._animIn = Animated.timing(this.state.height, config)
    this._animOut = Animated.timing(this.state.height, config2)
    this.setState({ animating: true })
    if (height === 0) {
      this._animOut.start(({ finished }) => {
        if (finished) {
          this.setState({ animating: false })
        }
      })
    } else {
      this._animIn.start(({ finished }) => {
        if (finished) {
          this.setState({ animating: false })
        }
      })
    }
  }

  _handleLayoutChange = event => {
    const contentHeight = event.nativeEvent.layout.height
    if (
      this.state.animating ||
      this.props.collapsed ||
      this.state.measuring ||
      this.state.contentHeight === contentHeight
    ) {
      return
    }

    this.state.height.setValue(contentHeight)
    this.setState({ contentHeight })
  }

  render() {
    const { collapsed, enablePointerEvents } = this.props
    const { height, measuring, measured } = this.state
    const hasKnownHeight = !measuring && (measured || collapsed)
    const style = hasKnownHeight && {
      overflow: 'hidden',
      height: height,
    }
    const contentStyle = {}
    if (measuring) {
      contentStyle.position = 'absolute'
      contentStyle.opacity = 0
    }
    return (
      <Animated.View style={style} pointerEvents={!enablePointerEvents && collapsed ? 'none' : 'auto'}>
        <Animated.View
          ref={this._handleRef}
          style={[this.props.style, contentStyle]}
          onLayout={this.state.animating ? undefined : this._handleLayoutChange}
        >
          {this.props.children}
        </Animated.View>
      </Animated.View>
    )
  }
}
