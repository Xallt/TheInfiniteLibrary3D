import { MainScene } from './scenes/MainScene';
import { BookMeshParams } from './components/Book';

document.addEventListener('DOMContentLoaded', () => {
    const defaultBookParams: BookMeshParams = {
        bookThickness: 1,
        bookWidth: 15,
        bookHeight: 20,
        coverWidth: 4,
        numPages: 100,
    };

    new MainScene(10, defaultBookParams);
});
