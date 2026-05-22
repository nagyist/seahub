import axios from 'axios';
import Cookies from 'js-cookie';
import { siteRoot } from './constants';

class ChatAPI {
  initForUsage({ siteRoot, xcsrfHeaders }) {
    const server = siteRoot && siteRoot.endsWith('/') ? siteRoot.slice(0, -1) : siteRoot;
    this.server = server;
    this.req = axios.create({
      headers: {
        'X-CSRFToken': xcsrfHeaders,
      }
    });
    return this;
  }

  _handleEventStreamRequest(url, form, options = {}) {
    let body = form;
    let headers = { ...options.headers };
    if (!headers['X-CSRFToken']) {
      const csrfToken = Cookies.get('sfcsrftoken');
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }
    }
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    if (!form) {
      return fetch(url, {
        method: 'GET',
        headers,
        credentials: 'include',
        signal: options.signal,
      });
    }

    if (form.getHeaders) {
      body = form;
      headers = { ...headers, ...form.getHeaders() };
    } else if (typeof form === 'object') {
      body = JSON.stringify(form);
    }

    return fetch(url, {
      method: 'POST',
      body,
      headers,
      credentials: 'include',
      signal: options.signal,
    });
  }

  sendChatMessageByStream(params, options = {}) {
    return this._handleEventStreamRequest(this.server + '/api/v1/ai/chat/', params, options);
  }

  getChatMessage(repoID, sessionId) {
    return this.req.get(this.server + '/api/v1/ai/chat/?session_uuid=' + sessionId);
  }

  getChatMessageByStream(repoID, sessionId, streamedLength, options = {}) {
    const url = this.server + '/api/v1/ai/chat/?session_uuid=' + sessionId + '&streamed_length=' + streamedLength;
    return this._handleEventStreamRequest(url, undefined, options);
  }

  listChatSessions(repoID) {
    return this.req.get(this.server + '/api/v1/chat/sessions/?repo_id=' + repoID);
  }

  createChatSession(repoID, sessionName) {
    return this.req.post(this.server + '/api/v1/chat/sessions/', {
      repo_id: repoID,
      session_name: sessionName,
    });
  }

  modifyChatSession(repoID, sessionUUID, update) {
    return this.req.put(this.server + '/api/v1/chat/sessions/' + sessionUUID + '/', {
      ...update,
      repo_id: repoID,
    });
  }

  deleteChatSession(repoID, sessionUUID) {
    return this.req.delete(this.server + '/api/v1/chat/sessions/' + sessionUUID + '/', {
      data: { repo_id: repoID },
    });
  }

  getChatMessages(repoID, sessionUUID) {
    return this.req.get(this.server + '/api/v1/chat/sessions/' + sessionUUID + '/messages/?repo_id=' + repoID);
  }
}

const chatAPI = new ChatAPI();
chatAPI.initForUsage({
  siteRoot,
  xcsrfHeaders: Cookies.get('sfcsrftoken'),
});

export { chatAPI };
