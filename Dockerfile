FROM ubuntu:24.04

# Set up code user
RUN useradd code

RUN chsh -s /bin/bash code

RUN mkdir /home/code
RUN chown code:code /home/code

# Install deps

ENV USE_BUILTIN_RIPGREP=0
RUN apt-get update && apt-get install -y \
    postgresql-client nodejs npm curl sudo neovim direnv supervisor

# Install playwright deps
RUN npx --yes playwright install-deps

RUN npm i -g @playwright/mcp

# Install pnpm and configure it to be global

RUN npm i -g pnpm

RUN mkdir -p /usr/local/share/pnpm/global/bin

RUN pnpm config set global-bin-dir /usr/local/share/pnpm/global/bin
RUN pnpm config set global-dir /usr/local/share/pnpm
RUN echo 'export PATH="/usr/local/share/pnpm/global/bin:$PATH"' | tee -a /etc/bash.bashrc

RUN bash -c 'PATH="/usr/local/share/pnpm/global/bin:$PATH" && pnpm i -g @anthropic-ai/claude-code'

USER code

# Install chromium. Has to be done using the playwright MCP version for proper pathing etc
RUN node /usr/local/lib/node_modules/@playwright/mcp/node_modules/playwright/cli.js install chromium

CMD ["/bin/bash"]