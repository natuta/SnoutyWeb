
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../shared/services/api.service';
import { Raza } from '../../shared/models/raza';

@Component({
  selector: 'app-razas-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './razas-list.html'
})
export default class RazasList {
  api = inject(ApiService);
  data: Raza[] = [];
  ngOnInit(){ this.load(); }
  load(){ this.api.listRazas().subscribe(d => this.data = d); }
  remove(id?: number){
    if(!id) return;
    if(confirm('¿Eliminar raza?')) this.api.deleteRaza(id).subscribe({next: _=> this.load()});
  }
}
