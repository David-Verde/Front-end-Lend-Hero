import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppComponent], // Declarar el componente
    }).compileComponents();
  });

  it('should render the correct structure', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    // Comprobar <main class="main">
    const mainElement = compiled.querySelector('main.main');
    expect(mainElement).toBeTruthy();

    // Comprobar <div class="content">
    const contentDiv = mainElement?.querySelector('div.content');
    expect(contentDiv).toBeTruthy();

    // Comprobar el texto en <h1>
    const h1 = contentDiv?.querySelector('h1');
    expect(h1?.textContent).toContain('Hello World');

    // Comprobar <router-outlet>
    const routerOutlet = compiled.querySelector('router-outlet');
    expect(routerOutlet).toBeTruthy();
  });
});
