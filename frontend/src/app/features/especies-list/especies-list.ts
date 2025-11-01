
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../shared/services/api.service';
import { Especie } from '../../shared/models/especie';

@Component({
  selector: 'app-especies-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './especies-list.html'
})
export default class EspeciesList {
  api = inject(ApiService);
  data: Especie[] = [];
  ngOnInit(){ this.load(); }
  load(){ this.api.listEspecies().subscribe(d => this.data = d); }
  remove(id?: number){
    if(!id) return;
    if(confirm('¿Eliminar especie?')) this.api.deleteEspecie(id).subscribe({next: _=> this.load()});
  }
}
