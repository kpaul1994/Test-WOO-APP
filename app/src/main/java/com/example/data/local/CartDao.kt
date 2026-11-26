package com.example.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface CartDao {
    @Query("SELECT * FROM cart_items WHERE storeUrl = :storeUrl ORDER BY addedAt DESC")
    fun observeCart(storeUrl: String): Flow<List<CartItemEntity>>

    @Query(
        "SELECT * FROM cart_items WHERE storeUrl = :storeUrl AND productId = :productId " +
            "AND ((:variationId IS NULL AND variationId IS NULL) OR variationId = :variationId) LIMIT 1"
    )
    suspend fun findCartItem(storeUrl: String, productId: Long, variationId: Long?): CartItemEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(item: CartItemEntity)

    @Update
    suspend fun update(item: CartItemEntity)

    @Query("UPDATE cart_items SET quantity = :quantity WHERE localId = :localId")
    suspend fun updateQuantity(localId: Long, quantity: Int)

    @Query("DELETE FROM cart_items WHERE localId = :localId")
    suspend fun deleteById(localId: Long)

    @Query("DELETE FROM cart_items WHERE storeUrl = :storeUrl")
    suspend fun clearStoreCart(storeUrl: String)
}
