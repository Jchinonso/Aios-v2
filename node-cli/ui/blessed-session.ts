/**
 * @fileoverview Production-Grade Blessed TUI Session Manager
 * @description Type-safe, dynamic layout with progressive input positioning
 *
 * Layout Behavior:
 * - Initial: Input sits right after banner (tight layout, no wasted space)
 * - Growth: Content pushes input downward as output accumulates
 * - Saturation: Input fixes at bottom when content fills viewport
 * - Scrolling: Enabled only when input reaches bottom, doesn't move input
 *
 * @module node-cli/ui/blessed-session
 * @version 2.0.0
 */

import blessed from 'blessed';
import stripAnsi from 'strip-ansi';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Layout state discriminated union for type-safe state transitions
 */
type LayoutState =
  | { mode: 'empty'; contentHeight: 0 }
  | { mode: 'growing'; contentHeight: number; inputPosition: number }
  | { mode: 'saturated'; contentHeight: number; scrollEnabled: true };

/**
 * Layout dimensions (all in terminal rows)
 */
interface LayoutDimensions {
  readonly screenHeight: number;
  readonly bannerHeight: number;
  readonly inputHeight: number;
  readonly availableContentHeight: number;
}

/**
 * Configuration for blessed session
 */
export interface BlessedSessionOptions {
  readonly onInput: (input: string) => Promise<void>;
  readonly onExit: () => void;
}

/**
 * Content line with optional formatting
 */
interface ContentLine {
  readonly text: string;
  readonly timestamp: Date;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LAYOUT_CONSTANTS = {
  BANNER_HEIGHT: 12,
  INPUT_HEIGHT: 3,
  MIN_SCREEN_HEIGHT: 20,
  DEFAULT_SCREEN_HEIGHT: 40,
  CONTENT_PADDING: 2, // Visual padding for content display
  SCROLL_LINE_STEP: 1,
  SCROLL_PAGE_DIVISOR: 4, // PageUp/Down scrolls 1/4 of viewport
} as const;

const UI_STRINGS = {
  PLACEHOLDER: '{gray-fg}{italic}No output yet...{/italic}{/gray-fg}',
  INPUT_LABEL: ' > ',
  SCREEN_TITLE: 'AIOS - AI DevOps Assistant',
} as const;

// ============================================================================
// BLESSED SESSION CLASS
// ============================================================================

/**
 * Production-grade blessed TUI session with dynamic layout management
 *
 * Features:
 * - Type-safe state machine for layout transitions
 * - Smooth, flicker-free rendering (smartCSR)
 * - Comprehensive keyboard navigation
 * - Terminal resize handling
 * - Memory-efficient content buffering
 * - Edge case handling (small terminals, long lines, etc.)
 */
export class BlessedSession {
  // Blessed widgets
  private readonly screen: blessed.Widgets.Screen;
  private readonly banner: blessed.Widgets.BoxElement;
  private readonly contentBox: blessed.Widgets.BoxElement;
  private readonly inputBox: blessed.Widgets.TextboxElement;

  // State
  private contentLines: readonly ContentLine[] = [];
  private layoutState: LayoutState = { mode: 'empty', contentHeight: 0 };
  private isDestroyed = false;

  constructor(private readonly options: BlessedSessionOptions) {
    // Initialize screen with optimal settings
    this.screen = this.createScreen();

    // Create UI components
    this.banner = this.createBanner();
    this.contentBox = this.createContentBox();
    this.inputBox = this.createInputBox();

    // Assemble UI
    this.screen.append(this.banner);
    this.screen.append(this.contentBox);
    this.screen.append(this.inputBox);

    // Setup event handlers
    this.setupEventHandlers();

    // Initial render
    this.inputBox.focus();
    this.safeRender();
  }

  // ==========================================================================
  // WIDGET CREATION
  // ==========================================================================

  private createScreen(): blessed.Widgets.Screen {
    return blessed.screen({
      smartCSR: true, // Efficient rendering (no flicker)
      fullUnicode: true,
      dockBorders: true,
      title: UI_STRINGS.SCREEN_TITLE,
    });
  }

  private createBanner(): blessed.Widgets.BoxElement {
    return blessed.box({
      top: 0,
      left: 0,
      width: '100%',
      height: LAYOUT_CONSTANTS.BANNER_HEIGHT,
      content: this.generateBannerContent(),
      tags: true,
      border: {
        type: 'line',
      },
      style: {
        border: {
          fg: 'cyan',
        },
      },
    });
  }

  private createContentBox(): blessed.Widgets.BoxElement {
    return blessed.box({
      top: LAYOUT_CONSTANTS.BANNER_HEIGHT,
      left: 0,
      width: '100%',
      height: 0, // Initially zero - grows with content
      content: UI_STRINGS.PLACEHOLDER,
      tags: true,
      scrollable: true,
      alwaysScroll: true,
      scrollbar: {
        ch: '█',
        track: {
          bg: 'black',
        },
        style: {
          fg: 'cyan',
          bg: 'black',
        },
      },
      style: {
        fg: 'white',
        bg: 'black',
      },
      padding: {
        left: 1,
        right: 1,
      },
      // Hide scrollbar initially
      hidden: false,
    });
  }

  private createInputBox(): blessed.Widgets.TextboxElement {
    return blessed.textbox({
      top: LAYOUT_CONSTANTS.BANNER_HEIGHT, // Initially right after banner
      left: 0,
      width: '100%',
      height: LAYOUT_CONSTANTS.INPUT_HEIGHT,
      inputOnFocus: true,
      border: {
        type: 'line',
      },
      style: {
        border: {
          fg: 'gray',
        },
        focus: {
          border: {
            fg: 'green',
          },
        },
        bg: 'black',
        fg: 'white',
      },
      label: UI_STRINGS.INPUT_LABEL,
      padding: {
        left: 1,
      },
    });
  }

  // ==========================================================================
  // EVENT HANDLING
  // ==========================================================================

  private setupEventHandlers(): void {
    this.setupInputHandlers();
    this.setupScrollHandlers();
    this.setupExitHandlers();
    this.setupResizeHandler();
  }

  private setupInputHandlers(): void {
    this.inputBox.on('submit', async (value: string) => {
      const trimmed = value.trim();

      if (!trimmed) {
        return;
      }

      // Handle special commands
      if (trimmed === '/clear') {
        this.handleClearCommand();
        return;
      }

      // Display user input
      this.addOutput(`{cyan-fg}> ${trimmed}{/cyan-fg}`);

      // Clear input field
      this.inputBox.clearValue();
      this.safeRender();

      // Process input
      try {
        await this.options.onInput(trimmed);
      } catch (error) {
        this.addOutput(
          `{red-fg}Error: ${error instanceof Error ? error.message : 'Unknown error'}{/red-fg}`
        );
      }

      // Refocus input
      this.inputBox.focus();
      this.safeRender();
    });
  }

  private setupScrollHandlers(): void {
    // Only allow scrolling when in saturated mode (input at bottom)
    const scrollIfSaturated = (scrollFn: () => void) => {
      if (this.layoutState.mode === 'saturated') {
        scrollFn();
        this.safeRender();
      }
    };

    // Line-by-line scrolling
    this.screen.key(['up', 'k'], () => {
      scrollIfSaturated(() => this.contentBox.scroll(-LAYOUT_CONSTANTS.SCROLL_LINE_STEP));
    });

    this.screen.key(['down', 'j'], () => {
      scrollIfSaturated(() => this.contentBox.scroll(LAYOUT_CONSTANTS.SCROLL_LINE_STEP));
    });

    // Page scrolling
    this.screen.key(['pageup'], () => {
      scrollIfSaturated(() => {
        const dims = this.calculateDimensions();
        const pageSize = Math.floor(dims.availableContentHeight / LAYOUT_CONSTANTS.SCROLL_PAGE_DIVISOR);
        this.contentBox.scroll(-Math.max(pageSize, 1));
      });
    });

    this.screen.key(['pagedown'], () => {
      scrollIfSaturated(() => {
        const dims = this.calculateDimensions();
        const pageSize = Math.floor(dims.availableContentHeight / LAYOUT_CONSTANTS.SCROLL_PAGE_DIVISOR);
        this.contentBox.scroll(Math.max(pageSize, 1));
      });
    });

    // Jump to top/bottom
    this.screen.key(['home'], () => {
      scrollIfSaturated(() => this.contentBox.setScrollPerc(0));
    });

    this.screen.key(['end'], () => {
      scrollIfSaturated(() => this.contentBox.setScrollPerc(100));
    });
  }

  private setupExitHandlers(): void {
    this.screen.key(['C-c'], () => this.handleExit());
    this.inputBox.key(['C-d'], () => this.handleExit());
  }

  private setupResizeHandler(): void {
    this.screen.on('resize', () => {
      this.updateLayout();
      this.safeRender();
    });
  }

  // ==========================================================================
  // LAYOUT MANAGEMENT
  // ==========================================================================

  /**
   * Calculate current layout dimensions
   */
  private calculateDimensions(): LayoutDimensions {
    const screenHeight =
      typeof this.screen.height === 'number' && this.screen.height >= LAYOUT_CONSTANTS.MIN_SCREEN_HEIGHT
        ? this.screen.height
        : LAYOUT_CONSTANTS.DEFAULT_SCREEN_HEIGHT;

    const availableContentHeight =
      screenHeight - LAYOUT_CONSTANTS.BANNER_HEIGHT - LAYOUT_CONSTANTS.INPUT_HEIGHT;

    return {
      screenHeight,
      bannerHeight: LAYOUT_CONSTANTS.BANNER_HEIGHT,
      inputHeight: LAYOUT_CONSTANTS.INPUT_HEIGHT,
      availableContentHeight: Math.max(availableContentHeight, 3), // Min 3 lines for content
    };
  }

  /**
   * Update layout based on current content and screen dimensions
   * Type-safe state transitions ensure correct behavior
   */
  private updateLayout(): void {
    const dims = this.calculateDimensions();
    const contentLineCount = this.contentLines.length;

    // Calculate required height for current content (with padding)
    const requiredHeight = Math.max(contentLineCount + LAYOUT_CONSTANTS.CONTENT_PADDING, 0);

    // State transition logic
    if (contentLineCount === 0) {
      // EMPTY: No content
      this.transitionToEmpty();
    } else if (requiredHeight < dims.availableContentHeight) {
      // GROWING: Content fits, input moves down
      this.transitionToGrowing(requiredHeight, dims);
    } else {
      // SATURATED: Content fills viewport, input fixed at bottom
      this.transitionToSaturated(dims);
    }
  }

  private transitionToEmpty(): void {
    this.layoutState = { mode: 'empty', contentHeight: 0 };

    // Position input right after banner (tight layout)
    this.contentBox.height = 0;
    this.inputBox.top = LAYOUT_CONSTANTS.BANNER_HEIGHT;

    // Show placeholder
    this.contentBox.setContent(UI_STRINGS.PLACEHOLDER);
  }

  private transitionToGrowing(contentHeight: number, _dims: LayoutDimensions): void {
    const inputPosition = LAYOUT_CONSTANTS.BANNER_HEIGHT + contentHeight;

    this.layoutState = {
      mode: 'growing',
      contentHeight,
      inputPosition,
    };

    // Content box grows, input moves down
    this.contentBox.top = LAYOUT_CONSTANTS.BANNER_HEIGHT;
    this.contentBox.height = contentHeight;
    this.inputBox.top = inputPosition;
  }

  private transitionToSaturated(dims: LayoutDimensions): void {
    this.layoutState = {
      mode: 'saturated',
      contentHeight: dims.availableContentHeight,
      scrollEnabled: true,
    };

    // Content fills available space, input fixed at bottom
    this.contentBox.top = LAYOUT_CONSTANTS.BANNER_HEIGHT;
    this.contentBox.height = dims.availableContentHeight;
    this.inputBox.top = dims.screenHeight - LAYOUT_CONSTANTS.INPUT_HEIGHT;
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Add output line to content area
   * Handles ANSI stripping, layout updates, and scrolling
   */
  public addOutput(text: string): void {
    if (this.isDestroyed) {
      return;
    }

    // Sanitize text (remove ANSI codes and box drawing characters)
    const cleanText = this.sanitizeText(text);

    if (!cleanText) {
      return;
    }

    // Add to content buffer
    const newLine: ContentLine = {
      text: cleanText,
      timestamp: new Date(),
    };

    this.contentLines = [...this.contentLines, newLine];

    // Update content display
    const displayText = this.contentLines.map((line) => line.text).join('\n');
    this.contentBox.setContent(displayText);

    // Recalculate layout
    this.updateLayout();

    // Auto-scroll to bottom
    this.contentBox.setScrollPerc(100);

    this.safeRender();
  }

  /**
   * Clear all output and reset to initial state
   */
  public clearOutput(): void {
    if (this.isDestroyed) {
      return;
    }

    this.contentLines = [];
    this.transitionToEmpty();
    this.safeRender();
  }

  /**
   * Destroy session and cleanup resources
   */
  public destroy(): void {
    if (this.isDestroyed) {
      return;
    }

    this.isDestroyed = true;
    this.screen.destroy();
  }

  /**
   * Force render (for external updates)
   */
  public render(): void {
    this.safeRender();
  }

  /**
   * Show provider selection menu within blessed UI with arrow key navigation
   * Returns selected provider or null if cancelled
   */
  public async selectProvider(): Promise<string | null> {
    return new Promise((resolve) => {
      const providers = [
        { name: 'Vercel', value: 'vercel' },
        { name: 'Netlify', value: 'netlify' },
        { name: 'AWS', value: 'aws' },
        { name: 'Railway', value: 'railway' },
        { name: 'Render', value: 'render' },
        { name: 'Cancel', value: null }
      ];

      let selectedIndex = 0;

      // Create a box to display the menu
      const menuBox = blessed.box({
        top: 'center',
        left: 'center',
        width: '50%',
        height: providers.length + 4,
        tags: true,
        border: {
          type: 'line'
        },
        style: {
          border: {
            fg: 'cyan'
          }
        },
        label: ' Select Cloud Provider ',
        padding: {
          left: 2,
          right: 2,
          top: 1,
          bottom: 1
        }
      });

      const renderMenu = () => {
        const lines = providers.map((p, idx) => {
          const prefix = idx === selectedIndex ? '❯' : ' ';
          const color = idx === selectedIndex ? 'green-fg' : p.value === null ? 'gray-fg' : 'white-fg';
          return `{${color}}${prefix} ${p.name}{/${color}}`;
        });
        menuBox.setContent(lines.join('\n'));
        this.screen.render();
      };

      // Initial render
      this.screen.append(menuBox);
      renderMenu();
      menuBox.focus();

      // Arrow key handler
      const keyHandler = (_ch: string, key: { name?: string }) => {
        if (key.name === 'up' || key.name === 'k') {
          selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : providers.length - 1;
          renderMenu();
        } else if (key.name === 'down' || key.name === 'j') {
          selectedIndex = selectedIndex < providers.length - 1 ? selectedIndex + 1 : 0;
          renderMenu();
        } else if (key.name === 'return' || key.name === 'enter') {
          // Cleanup
          this.screen.remove(menuBox);
          ['up', 'down', 'k', 'j', 'return', 'enter', 'escape'].forEach(k => {
            this.screen.unkey(k, keyHandler);
          });
          this.inputBox.focus();

          const selection = providers[selectedIndex];
          if (selection?.value === null) {
            this.addOutput('{gray-fg}Deployment cancelled{/gray-fg}');
            resolve(null);
          } else if (selection) {
            this.addOutput(`{green-fg}Selected: ${selection.name}{/green-fg}`);
            resolve(selection.value);
          }
        } else if (key.name === 'escape') {
          // Cancel on escape
          this.screen.remove(menuBox);
          ['up', 'down', 'k', 'j', 'return', 'enter', 'escape'].forEach(k => {
            this.screen.unkey(k, keyHandler);
          });
          this.inputBox.focus();
          this.addOutput('{gray-fg}Deployment cancelled{/gray-fg}');
          resolve(null);
        }
      };

      // Register key handlers
      this.screen.key(['up', 'down', 'k', 'j', 'return', 'enter', 'escape'], keyHandler);
    });
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private sanitizeText(text: string): string {
    return stripAnsi(text)
      .replace(/[┌┐└┘─│╭╮╰╯═║╔╗╚╝]/g, '') // Remove box drawing chars
      .replace(/^\s*[-=]{3,}\s*$/gm, '') // Remove separator lines
      .trim();
  }

  private generateBannerContent(): string {
    const workingDir = process.cwd();
    const projectName = workingDir.split('/').pop() || 'Unknown';

    return `{cyan-fg}{bold}AIOS - AI DevOps Assistant{/bold}{/cyan-fg}

{white-fg}Project: ${projectName}{/white-fg}
{gray-fg}AI-powered deployments to cloud{/gray-fg}

{yellow-fg}Quick Commands{/yellow-fg}
{gray-fg}deploy, analyze, connect, /clear{/gray-fg}

{yellow-fg}Supported Providers{/yellow-fg}
{gray-fg}Vercel • Netlify • AWS • Railway • Render{/gray-fg}`;
  }

  private handleClearCommand(): void {
    this.clearOutput();
    this.inputBox.clearValue();
    this.inputBox.focus();
    this.safeRender();
  }

  private handleExit(): void {
    this.options.onExit();
  }

  private safeRender(): void {
    if (!this.isDestroyed) {
      this.screen.render();
    }
  }
}
