/// <reference types="vite/client" />
/// <reference types="@unocss/vite/client" />
/// <reference types="antdv-next/global" />

declare module '*.vue' {
    import type { DefineComponent } from 'vue'

    const component: DefineComponent<{}, {}, any>

    export default component
}

interface ImportMetaEnv {
    readonly VITE_APP_BASE_API: string;
    readonly VITE_APP_WS_API: string;
    readonly VITE_APP_DOC_API: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

interface Window {
    initTAC: (tacPath: string, config: object, style: object) => Promise<any>;

    documentPictureInPicture: {
        window: Window
        requestWindow: (options?: {
            width: number
            height: number
        }) => Promise<Window>
        onenter: () => void
    }
}

declare module 'nprogress'

declare module 'crypto-js'

declare module 'vue-cropper'

declare module 'lodash-es'

declare module 'uuid'
