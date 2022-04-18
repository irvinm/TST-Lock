![CI/CD](https://github.com/irvinm/TST-Lock/workflows/CI/CD/badge.svg)

# TST Lock

This is the project that is based on removing the ability to accidentally close a tab via the "X" for tabs that you consider important and don't want to lose. Holding "Ctrl + Shift" while clicking on a tab will replace the "X" with a lock graphic. You can still close the tab (even with the lock displayed) by right-clicking and selecting "Close Tab".

Original discussion: https://github.com/piroor/treestyletab/issues/2104

------

You can change how the lock graphic is sized and positioned by using TST CSS.

In my screenshot example, I used:

```
#tabbar tab-item.locked tab-closebox {
  display: initial;
  height: 36px;
  width: 18px; 
  transform: scale(1.3);
  opacity: 1 !important;
}
```
