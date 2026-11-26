package com.example.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface WishlistDao {
    @Query("SELECT * FROM wishlist_items WHERE storeUrl = :storeUrl ORDER BY addedAt DESC")
    fun observeWishlist(storeUrl: String): Flow<List<WishlistItemEntity>>

    @Query("SELECT productId FROM wishlist_items WHERE storeUrl = :storeUrl")
    fun observeWishlistIds(storeUrl: String): Flow<List<Long>>

    @Query("SELECT EXISTS(SELECT 1 FROM wishlist_items WHERE storeUrl = :storeUrl AND productId = :productId)")
    suspend fun isWishlisted(storeUrl: String, productId: Long): Boolean

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(item: WishlistItemEntity)

    @Query("DELETE FROM wishlist_items WHERE storeUrl = :storeUrl AND productId = :productId")
    suspend fun delete(storeUrl: String, productId: Long)
}
